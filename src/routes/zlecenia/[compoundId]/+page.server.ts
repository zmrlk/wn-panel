import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	lead,
	offer,
	offerItem,
	booking,
	bookingTent,
	client,
	item,
	stockMovement,
	payment,
	user,
	bookingAssignment
} from '$lib/server/db/schema';
import { asc, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

/**
 * Unified detail page dla zlecenia.
 * URL: /zlecenia/{type}-{uuid} (type = lead|offer|booking)
 * Fetches data per type + normalizes do wspólnego shape'u.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const compound = params.compoundId;
	const dashIdx = compound.indexOf('-');
	if (dashIdx < 0) throw error(400, 'Invalid zlecenie id');

	const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
	const id = compound.slice(dashIdx + 1);

	type Zlecenie = {
		type: 'lead' | 'offer' | 'booking';
		id: string;
		number: string | null;
		status: string;
		stageLabel: string;
		stageEmoji: string;
		client: {
			id: string | null;
			name: string;
			company: string | null;
			phone: string | null;
			email: string | null;
			address: string | null;
		} | null;
		event: {
			name: string;
			startDate: string | null;
			endDate: string | null;
			venue: string | null;
			guestsCount: number | null;
		};
		totalCents: number | null;
		items: Array<{ description: string; quantity: number; unitPriceCents: number; lineTotalCents: number }>;
		// Booking-only: raw booking_tent do akcji dispatch/return
		bookingTents: Array<{ tentId: string; itemName: string; quantity: number }>;
		// Booking-only: lista płatności + suma
		payments: Array<{
			id: string;
			amountCents: number;
			method: string;
			kind: string;
			paidAt: string;
			receivedBy: string | null;
			notes: string | null;
		}>;
		paidCents: number;
		// Booking-only: kto realizuje (driver/installer/lead)
		assignments: Array<{
			id: string;
			userId: string;
			userName: string;
			task: string;
			notes: string | null;
		}>;
		notes: string | null;
		message: string | null;
		source: string | null;
		createdAt: Date;
		sentAt: Date | null;
		viewedAt: Date | null;
		acceptedAt: Date | null;
	};

	// Unified labels — "w trakcie" dla pośrednich stanów, ale zachowujemy fine-grained sub-label
	const STAGES: Record<string, { label: string; emoji: string }> = {
		'lead:new': { label: 'Nowy', emoji: '🆕' },
		'lead:contacted': { label: 'W trakcie · kontakt', emoji: '📞' },
		'lead:qualified': { label: 'W trakcie · hot', emoji: '🎯' },
		'lead:quoted': { label: 'W trakcie · oferta', emoji: '✉️' },
		'lead:won': { label: 'Wygrany', emoji: '✅' },
		'lead:lost': { label: 'Przegrany', emoji: '✕' },
		'lead:archived': { label: 'Archiwum', emoji: '📦' },
		'offer:draft': { label: 'W trakcie · szkic', emoji: '✏️' },
		'offer:sent': { label: 'W trakcie · wysłana', emoji: '✉️' },
		'offer:viewed': { label: 'W trakcie · zobaczył', emoji: '👀' },
		'offer:accepted': { label: 'Wygrany', emoji: '✅' },
		'offer:rejected': { label: 'Przegrany', emoji: '✕' },
		'offer:expired': { label: 'Przegrany · wygasła', emoji: '⏰' },
		'booking:draft': { label: 'W trakcie · szkic', emoji: '📝' },
		'booking:confirmed': { label: 'W trakcie · potwierdzona', emoji: '✅' },
		'booking:in-progress': { label: 'W trakcie · realizacja', emoji: '🚚' },
		'booking:done': { label: 'Wygrany', emoji: '🎉' },
		'booking:cancelled': { label: 'Przegrany', emoji: '✕' }
	};

	let zlecenie: Zlecenie;

	if (type === 'lead') {
		const [l] = await db.select().from(lead).where(eq(lead.id, id)).limit(1);
		if (!l) throw error(404, 'Lead nie istnieje');
		const s = STAGES[`lead:${l.status}`] ?? STAGES['lead:new'];
		zlecenie = {
			type: 'lead',
			id: l.id,
			number: null,
			status: l.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: {
				id: null,
				name: l.name,
				company: l.company,
				phone: l.phone,
				email: l.email,
				address: null
			},
			event: {
				name: l.eventName ?? 'Brak nazwy',
				startDate: l.eventDateHint,
				endDate: null,
				venue: l.venueHint,
				guestsCount: l.guestsCount
			},
			totalCents: null,
			items: [],
			bookingTents: [],
			payments: [],
			paidCents: 0,
			assignments: [],
			notes: l.notes,
			message: l.message,
			source: l.source,
			createdAt: l.createdAt,
			sentAt: null,
			viewedAt: null,
			acceptedAt: null
		};
	} else if (type === 'offer') {
		const [o] = await db
			.select({
				offer: offer,
				client: client
			})
			.from(offer)
			.leftJoin(client, eq(offer.clientId, client.id))
			.where(eq(offer.id, id))
			.limit(1);
		if (!o) throw error(404, 'Oferta nie istnieje');
		const items = await db.select().from(offerItem).where(eq(offerItem.offerId, id));
		const s = STAGES[`offer:${o.offer.status}`] ?? STAGES['offer:draft'];
		zlecenie = {
			type: 'offer',
			id: o.offer.id,
			number: o.offer.number,
			status: o.offer.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: o.client
				? {
						id: o.client.id,
						name: o.client.name,
						company: o.client.company,
						phone: o.client.phone,
						email: o.client.email,
						address: o.client.address
					}
				: null,
			event: {
				name: o.offer.eventName,
				startDate: o.offer.eventStartDate,
				endDate: o.offer.eventEndDate,
				venue: o.offer.venue,
				guestsCount: null
			},
			totalCents: o.offer.totalCents,
			items: items.map((i) => ({
				description: i.description,
				quantity: i.quantity,
				unitPriceCents: i.unitPriceCents,
				lineTotalCents: i.lineTotalCents
			})),
			bookingTents: [],
			payments: [],
			paidCents: 0,
			assignments: [],
			notes: o.offer.notes,
			message: null,
			source: null,
			createdAt: o.offer.createdAt,
			sentAt: o.offer.sentAt,
			viewedAt: o.offer.viewedAt,
			acceptedAt: o.offer.acceptedAt
		};
	} else if (type === 'booking') {
		const [b] = await db
			.select({ booking: booking, client: client })
			.from(booking)
			.leftJoin(client, eq(booking.clientId, client.id))
			.where(eq(booking.id, id))
			.limit(1);
		if (!b) throw error(404, 'Rezerwacja nie istnieje');
		// Fetch items via booking_tent join + payments + assignments
		const [bookedItems, payments, assignmentsRaw] = await Promise.all([
			db
				.select({ bookingTent: bookingTent, item: item })
				.from(bookingTent)
				.leftJoin(item, eq(bookingTent.tentId, item.id))
				.where(eq(bookingTent.bookingId, id)),
			db
				.select()
				.from(payment)
				.where(eq(payment.bookingId, id))
				.orderBy(asc(payment.paidAt)),
			db
				.select({
					id: bookingAssignment.id,
					userId: bookingAssignment.userId,
					task: bookingAssignment.task,
					notes: bookingAssignment.notes,
					userName: user.name
				})
				.from(bookingAssignment)
				.leftJoin(user, eq(bookingAssignment.userId, user.id))
				.where(eq(bookingAssignment.bookingId, id))
				.orderBy(asc(bookingAssignment.createdAt))
		]);
		const paidCentsTotal = payments.reduce((s, p) => s + p.amountCents, 0);
		const s = STAGES[`booking:${b.booking.status}`] ?? STAGES['booking:confirmed'];
		zlecenie = {
			type: 'booking',
			id: b.booking.id,
			number: null,
			status: b.booking.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: b.client
				? {
						id: b.client.id,
						name: b.client.name,
						company: b.client.company,
						phone: b.client.phone,
						email: b.client.email,
						address: b.client.address
					}
				: null,
			event: {
				name: b.booking.eventName,
				startDate: b.booking.startDate,
				endDate: b.booking.endDate,
				venue: b.booking.venue,
				guestsCount: null
			},
			totalCents: b.booking.priceCents,
			items: bookedItems.map((bi) => ({
				description: bi.item?.name ?? 'Pozycja',
				quantity: bi.bookingTent.quantity,
				unitPriceCents: bi.item?.pricePerDayCents ?? 0,
				lineTotalCents: (bi.item?.pricePerDayCents ?? 0) * bi.bookingTent.quantity
			})),
			bookingTents: bookedItems
				.filter((bi) => bi.item)
				.map((bi) => ({
					tentId: bi.bookingTent.tentId,
					itemName: bi.item?.name ?? 'Pozycja',
					quantity: bi.bookingTent.quantity
				})),
			payments: payments.map((p) => ({
				id: p.id,
				amountCents: p.amountCents,
				method: p.method,
				kind: p.kind,
				paidAt: p.paidAt,
				receivedBy: p.receivedBy,
				notes: p.notes
			})),
			paidCents: paidCentsTotal,
			assignments: assignmentsRaw.map((a) => ({
				id: a.id,
				userId: a.userId,
				userName: a.userName ?? '—',
				task: a.task,
				notes: a.notes
			})),
			notes: b.booking.notes,
			message: null,
			source: null,
			createdAt: b.booking.createdAt,
			sentAt: null,
			viewedAt: null,
			acceptedAt: null
		};
	} else {
		throw error(400, `Nieznany typ zlecenia: ${type}`);
	}

	// Available users do przydziału (tylko dla type=booking — UI pokazuje assign)
	let availableUsers: Array<{ id: string; name: string; skills: string[] }> = [];
	if (type === 'booking') {
		const rows = await db
			.select({ id: user.id, name: user.name, skills: user.skills })
			.from(user)
			.orderBy(asc(user.name));
		availableUsers = rows.map((r) => ({ id: r.id, name: r.name, skills: r.skills ?? [] }));
	}

	return { user, zlecenie, availableUsers };
};

export const actions: Actions = {
	updateStatus: async ({ request, params }) => {
		const form = await request.formData();
		const bucket = form.get('status')?.toString();
		if (!bucket) return fail(400);

		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
		const id = compound.slice(dashIdx + 1);

		// Unified bucket → DB status per-type (v5.20: 6 DB statuses, 5 UI buckets)
		const UNIFIED_TO_DB: Record<string, Record<string, string>> = {
			lead: {
				nowy: 'new',
				'w-trakcie': 'contacted',
				przegrany: 'lost',
				archiwum: 'archived'
			},
			offer: {
				'w-trakcie': 'sent',
				wygrany: 'accepted',
				przegrany: 'rejected'
			},
			booking: {
				wygrany: 'confirmed',
				zrealizowany: 'done',
				przegrany: 'cancelled'
			}
		};

		// Fallback: jeśli to już surowy DB status (np. ktoś prześle "new"), pozostaw bez mapowania
		const mapped = UNIFIED_TO_DB[type]?.[bucket] ?? bucket;

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

				// Zaznacz ofertę jako skonwertowaną
				await db
					.update(offer)
					.set({
						convertedToBookingId: newBooking.id,
						acceptedAt: new Date(),
						updatedAt: new Date()
					})
					.where(eq(offer.id, id));

				// Redirect do nowo utworzonego bookingu
				throw redirect(303, `/zlecenia/booking-${newBooking.id}`);
			}
		}

		return { success: true };
	},

	addNote: async ({ request, params, locals }) => {
		const form = await request.formData();
		const content = form.get('content')?.toString().trim() ?? '';
		if (!content) return fail(400, { error: 'empty' });

		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx) as 'lead' | 'offer' | 'booking';
		const id = compound.slice(dashIdx + 1);

		const author = locals.user?.name ?? 'Denis';
		const ts = new Date().toLocaleString('pl-PL', {
			day: '2-digit',
			month: '2-digit',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
		const entry = `[${ts} · ${author}] ${content}`;

		// Append to existing notes (newest first)
		const table = type === 'lead' ? lead : type === 'offer' ? offer : booking;
		const [existing] = await db.select({ notes: table.notes }).from(table).where(eq(table.id, id));
		const combined = existing?.notes ? `${entry}\n\n${existing.notes}` : entry;
		await db.update(table).set({ notes: combined, updatedAt: new Date() }).where(eq(table.id, id));
		return { success: true };
	},

	// ═══ Wydaj booking na event: confirmed → in-progress + OUT movements ═══
	dispatchBooking: async ({ params, locals }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Tylko dla bookingów' });

		const [b] = await db.select().from(booking).where(eq(booking.id, id)).limit(1);
		if (!b) return fail(404);
		if (b.status !== 'confirmed') return fail(400, { error: 'Booking nie jest w stanie confirmed' });

		const tents = await db.select().from(bookingTent).where(eq(bookingTent.bookingId, id));
		const userId = locals.user?.id ?? null;

		// Dla każdego booking_tent — wystaw OUT wydanie_na_event
		if (tents.length > 0) {
			await db.insert(stockMovement).values(
				tents.map((t) => ({
					itemId: t.tentId,
					direction: 'OUT',
					kind: 'wydanie_na_event',
					qty: t.quantity,
					bookingId: id,
					reason: `Wydanie na event: ${b.eventName}`,
					createdBy: userId
				}))
			);
		}

		await db
			.update(booking)
			.set({ status: 'in-progress', updatedAt: new Date() })
			.where(eq(booking.id, id));
		return { success: true };
	},

	// ═══ Driver Flow (v5.23) — przypisania do bookingu ═══
	assignUser: async ({ request, params }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Przydziały tylko dla bookingów' });

		const form = await request.formData();
		const userId = form.get('userId')?.toString();
		const task = form.get('task')?.toString() ?? 'driver';
		const notes = form.get('notes')?.toString()?.trim() || null;
		if (!userId) return fail(400, { error: 'Wybierz osobę' });
		if (!['driver', 'installer', 'lead', 'other'].includes(task)) {
			return fail(400, { error: 'Nieprawidłowy task' });
		}

		try {
			await db.insert(bookingAssignment).values({
				bookingId: id,
				userId,
				task,
				notes
			});
		} catch {
			return fail(400, { error: 'Ta osoba jest już przypisana z tym taskiem' });
		}
		return { success: true };
	},

	unassignUser: async ({ request }) => {
		const form = await request.formData();
		const assignmentId = form.get('assignmentId')?.toString();
		if (!assignmentId) return fail(400);
		await db.delete(bookingAssignment).where(eq(bookingAssignment.id, assignmentId));
		return { success: true };
	},

	// ═══ Płatności (v5.21) — tylko dla booking ═══
	addPayment: async ({ request, params, locals }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Płatności tylko dla bookingów' });

		const form = await request.formData();
		const amountZl = Number(form.get('amountZl') ?? '0');
		const method = (form.get('method')?.toString() ?? 'gotówka').trim();
		const kind = (form.get('kind')?.toString() ?? 'pełna').trim();
		const paidAtRaw = form.get('paidAt')?.toString() || new Date().toISOString().slice(0, 10);
		const notes = form.get('notes')?.toString()?.trim() || null;

		if (!Number.isFinite(amountZl) || amountZl <= 0) return fail(400, { error: 'Kwota > 0' });
		if (!['gotówka', 'przelew', 'inne'].includes(method)) return fail(400, { error: 'Nieznana metoda' });

		await db.insert(payment).values({
			bookingId: id,
			amountCents: Math.round(amountZl * 100),
			method,
			kind,
			paidAt: paidAtRaw,
			receivedBy: locals.user?.id ?? null,
			notes
		});
		return { success: true };
	},

	deletePayment: async ({ request, params }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		if (type !== 'booking') return fail(400);

		const form = await request.formData();
		const paymentId = form.get('paymentId')?.toString();
		if (!paymentId) return fail(400);
		await db.delete(payment).where(eq(payment.id, paymentId));
		return { success: true };
	},

	// ═══ Zakończ booking: in-progress → done + IN movements (zwrot) + ew. straty ═══
	returnBooking: async ({ request, params, locals }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Tylko dla bookingów' });

		const form = await request.formData();
		const [b] = await db.select().from(booking).where(eq(booking.id, id)).limit(1);
		if (!b) return fail(404);
		if (b.status !== 'in-progress') return fail(400, { error: 'Booking nie jest in-progress' });

		const tents = await db.select().from(bookingTent).where(eq(bookingTent.bookingId, id));
		const userId = locals.user?.id ?? null;

		const movements: Array<typeof stockMovement.$inferInsert> = [];
		for (const t of tents) {
			const issued = t.quantity;
			const returnedRaw = form.get(`return_${t.tentId}`)?.toString();
			const returned = returnedRaw != null ? Math.max(0, Math.min(issued, Number(returnedRaw))) : issued;
			const lost = issued - returned;

			if (returned > 0) {
				movements.push({
					itemId: t.tentId,
					direction: 'IN',
					kind: 'zwrot_po_evencie',
					qty: returned,
					bookingId: id,
					reason: `Zwrot po evencie: ${b.eventName}`,
					createdBy: userId
				});
			}
			if (lost > 0) {
				movements.push({
					itemId: t.tentId,
					direction: 'OUT',
					kind: 'strata',
					qty: lost,
					bookingId: id,
					reason: `Strata po evencie: ${b.eventName} (${lost} szt. nie wróciło)`,
					createdBy: userId
				});
			}
		}

		if (movements.length > 0) {
			await db.insert(stockMovement).values(movements);
		}

		await db
			.update(booking)
			.set({ status: 'done', updatedAt: new Date() })
			.where(eq(booking.id, id));
		return { success: true };
	}
};
