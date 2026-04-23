import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { lead, offer, offerItem, booking, bookingTent } from '$lib/server/db/schema';
import { unifiedToDbStatus } from '$lib/booking-stages';
import { parseCompoundId } from '$lib/compound-id';
import { checkAvailability } from '$lib/server/availability-check';

/**
 * Update status dla lead/offer/booking.
 * Bonus: auto-konwersja offer.accepted → utwórz booking + booking_tent
 * + redirect do nowego bookingu.
 *
 * Hard block: przed offer → booking sprawdzamy availability. Jeśli konflikt,
 * fail(409) z listą brakujących pozycji. Status oferty pozostaje niezmieniony.
 */
export async function updateStatus(event: RequestEvent) {
	const form = await event.request.formData();
	const bucket = form.get('status')?.toString();
	if (!bucket) return fail(400);

	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok) return fail(400, { error: 'Nieprawidłowy compound id' });
	const { type, id } = parsed;

	const mapped = unifiedToDbStatus(type, bucket);

	// ═══ HARD BLOCK: availability check przed offer → booking ═══
	if (type === 'offer' && mapped === 'accepted') {
		const [o] = await db.select().from(offer).where(eq(offer.id, id)).limit(1);
		if (o && !o.convertedToBookingId) {
			const items = await db.select().from(offerItem).where(eq(offerItem.offerId, id));
			const tentItems = items.filter((i) => i.tentId);
			if (tentItems.length > 0) {
				const spec = new Map<string, number>();
				for (const it of tentItems) {
					if (!it.tentId) continue;
					spec.set(it.tentId, (spec.get(it.tentId) ?? 0) + it.quantity);
				}
				const av = await checkAvailability(
					o.eventStartDate,
					o.eventEndDate,
					Array.from(spec.entries()).map(([itemId, requested]) => ({ itemId, requested }))
				);
				if (av.hasConflicts) {
					const bad = av.items.filter((i) => !i.ok);
					return fail(409, {
						error: 'availability_conflict',
						message:
							`Nie można potwierdzić rezerwacji: ${bad.length} ${bad.length === 1 ? 'pozycja niedostępna' : 'pozycji niedostępne'} ` +
							`w wybranych datach (${o.eventStartDate} → ${o.eventEndDate}). Zmień pozycje lub daty.`,
						conflicts: bad.map((c) => ({
							name: c.name,
							requested: c.requested,
							available: c.available,
							totalQty: c.totalQty,
							bookings: c.conflicts.map((bc) => ({
								eventName: bc.eventName,
								from: bc.overlapFrom,
								to: bc.overlapTo,
								quantity: bc.quantity
							}))
						}))
					});
				}
			}
		}
	}

	const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
	await db.update(table).set({ status: mapped, updatedAt: new Date() }).where(eq(table.id, id));

	// ═══ AUTO-KONWERSJA: offer.accepted → utwórz booking + booking_tent ═══
	// Już po hard-block — availability potwierdzona.
	if (type === 'offer' && mapped === 'accepted') {
		const [o] = await db.select().from(offer).where(eq(offer.id, id)).limit(1);
		if (o && !o.convertedToBookingId && o.clientId) {
			const items = await db.select().from(offerItem).where(eq(offerItem.offerId, id));
			const [newBooking] = await db
				.insert(booking)
				.values({
					clientId: o.clientId,
					eventName: o.eventName,
					startDate: o.eventStartDate,
					endDate: o.eventEndDate,
					venue: o.venue,
					priceCents: o.totalCents,
					status: 'confirmed',
					notes: `Rezerwacja utworzona z oferty ${o.number} (${new Date().toLocaleDateString('pl-PL')})`
				})
				.returning();

			const tentItems = items.filter((i) => i.tentId);
			if (tentItems.length > 0) {
				await db.insert(bookingTent).values(
					tentItems.map((i) => ({
						bookingId: newBooking.id,
						tentId: i.tentId!,
						quantity: i.quantity
					}))
				);
			}

			await db
				.update(offer)
				.set({
					convertedToBookingId: newBooking.id,
					acceptedAt: new Date(),
					updatedAt: new Date()
				})
				.where(eq(offer.id, id));

			throw redirect(303, `/zlecenia/booking-${newBooking.id}`);
		}
	}

	return { success: true };
}
