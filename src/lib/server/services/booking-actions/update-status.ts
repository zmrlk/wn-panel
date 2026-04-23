import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { lead, offer, offerItem, booking, bookingTent } from '$lib/server/db/schema';
import { unifiedToDbStatus } from '$lib/booking-stages';
import { parseCompoundId } from '$lib/compound-id';

/**
 * Update status dla lead/offer/booking.
 * Bonus: auto-konwersja offer.accepted → utwórz booking + booking_tent
 * + redirect do nowego bookingu.
 */
export async function updateStatus(event: RequestEvent) {
	const form = await event.request.formData();
	const bucket = form.get('status')?.toString();
	if (!bucket) return fail(400);

	const parsed = parseCompoundId(event.params.compoundId!);
	if (!parsed.ok) return fail(400, { error: 'Nieprawidłowy compound id' });
	const { type, id } = parsed;

	const mapped = unifiedToDbStatus(type, bucket);
	const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
	await db.update(table).set({ status: mapped, updatedAt: new Date() }).where(eq(table.id, id));

	// ═══ AUTO-KONWERSJA: offer.accepted → utwórz booking + booking_tent ═══
	// Gdy user klika "Wygrany" na ofercie: automatycznie tworzymy rezerwację.
	// Przenosi items (tylko te z tentId != null) do booking_tent.
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

			// Tylko items powiązane z magazynem (tentId != null) trafiają do booking_tent
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
