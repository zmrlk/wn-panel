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
	bookingAssignment,
	photo
} from '$lib/server/db/schema';
import { desc } from 'drizzle-orm';
import { writeFile, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { asc, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';

/**
 * Unified detail page dla zlecenia.
 * URL: /zlecenia/{type}-{uuid} (type = lead|offer|booking)
 * Fetches data per type + normalizes do wspólnego shape'u.
 */
export const load: PageServerLoad = async ({ params, locals }) => {
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const compound = params.compoundId;
	const dashIdx = compound.indexOf('-');
	if (dashIdx < 0) throw error(400, { message: 'Nieprawidłowy format id zlecenia' });

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
		// Multi-source timeline (v5.25)
		timeline: Array<{
			label: string;
			date: Date | null;
			emoji: string;
			kind: string;
			note: string | null;
		}>;
		photos: Array<{
			id: string;
			url: string;
			kind: string;
			caption: string | null;
			takenBy: string | null;
			takenByName: string | null;
			uploadedAt: Date;
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
		if (!l) throw error(404, { message: 'Lead nie istnieje' });
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
			timeline: [],
			photos: [],
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
		if (!o) throw error(404, { message: 'Oferta nie istnieje' });
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
			timeline: [],
			photos: [],
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
			.select({
				bookingId: booking.id,
				eventName: booking.eventName,
				startDate: booking.startDate,
				endDate: booking.endDate,
				venue: booking.venue,
				priceCents: booking.priceCents,
				status: booking.status,
				notes: booking.notes,
				createdAt: booking.createdAt,
				clientId: booking.clientId,
				clientName: client.name,
				clientCompany: client.company,
				clientPhone: client.phone,
				clientEmail: client.email,
				clientAddress: client.address
			})
			.from(booking)
			.leftJoin(client, eq(booking.clientId, client.id))
			.where(eq(booking.id, id))
			.limit(1);
		if (!b) throw error(404, { message: 'Rezerwacja nie istnieje' });
		// Fetch items via booking_tent join + payments + assignments + photos + movements
		const [bookedItems, payments, assignmentsRaw, photosRaw, movementsRaw] = await Promise.all([
			db
				.select({
					tentId: bookingTent.tentId,
					quantity: bookingTent.quantity,
					itemName: item.name,
					itemPriceCents: item.pricePerDayCents
				})
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
				.orderBy(asc(bookingAssignment.createdAt)),
			db
				.select({
					id: photo.id,
					url: photo.url,
					kind: photo.kind,
					caption: photo.caption,
					takenBy: photo.takenBy,
					takenByName: user.name,
					uploadedAt: photo.uploadedAt
				})
				.from(photo)
				.leftJoin(user, eq(photo.takenBy, user.id))
				.where(eq(photo.bookingId, id))
				.orderBy(desc(photo.uploadedAt)),
			db
				.select({
					id: stockMovement.id,
					direction: stockMovement.direction,
					kind: stockMovement.kind,
					qty: stockMovement.qty,
					reason: stockMovement.reason,
					notes: stockMovement.notes,
					createdAt: stockMovement.createdAt,
					itemName: item.name
				})
				.from(stockMovement)
				.leftJoin(item, eq(stockMovement.itemId, item.id))
				.where(eq(stockMovement.bookingId, id))
				.orderBy(asc(stockMovement.createdAt))
		]);
		const paidCentsTotal = payments.reduce((s, p) => s + p.amountCents, 0);

		// Multi-source timeline: booking created, assignments, dispatch (OUT), payments, photos, return (IN), strata, done
		type TimelineEvent = {
			label: string;
			date: Date | null;
			emoji: string;
			kind: string;
			note: string | null;
		};
		const timeline: TimelineEvent[] = [];
		timeline.push({ label: 'Rezerwacja utworzona', date: b.createdAt, emoji: '➕', kind: 'created', note: null });
		for (const a of assignmentsRaw) {
			timeline.push({
				label: `Przypisano: ${a.userName ?? '—'} (${a.task === 'driver' ? 'kierowca' : a.task === 'installer' ? 'montaż' : a.task === 'lead' ? 'lider' : a.task})`,
				date: null, // assignmentsRaw nie ma createdAt — użyjemy null, sortuje na dół
				emoji: '👥',
				kind: 'assignment',
				note: a.notes
			});
		}
		// Dispatch OUT (wydanie_na_event) — zbieramy qty aggregated
		const dispatchMovements = movementsRaw.filter((m) => m.kind === 'wydanie_na_event');
		if (dispatchMovements.length > 0) {
			const firstDispatch = dispatchMovements[0];
			const totalItems = dispatchMovements.reduce((sum, m) => sum + m.qty, 0);
			const names = dispatchMovements.map((m) => `${m.qty}× ${m.itemName}`).join(', ');
			timeline.push({
				label: `Wydano na event (${totalItems} szt.)`,
				date: firstDispatch.createdAt,
				emoji: '🚚',
				kind: 'dispatch',
				note: names
			});
		}
		for (const p of payments) {
			timeline.push({
				label: `Płatność ${(p.amountCents / 100).toLocaleString('pl-PL')} zł (${p.method})`,
				date: p.paidAt ? new Date(p.paidAt) : null,
				emoji: '💰',
				kind: 'payment',
				note: p.notes
			});
		}
		for (const p of photosRaw) {
			timeline.push({
				label: `Zdjęcie: ${p.kind === 'delivery' ? 'dostawa' : p.kind === 'return' ? 'odbiór' : p.kind === 'damage' ? 'uszkodzenie' : 'inne'}`,
				date: p.uploadedAt,
				emoji: '📸',
				kind: 'photo',
				note: p.caption
			});
		}
		// Return (IN) + strata
		const returnMovements = movementsRaw.filter((m) => m.kind === 'zwrot_po_evencie');
		const stratyMovements = movementsRaw.filter((m) => m.kind === 'strata');
		if (returnMovements.length > 0) {
			const firstReturn = returnMovements[0];
			const totalReturned = returnMovements.reduce((sum, m) => sum + m.qty, 0);
			timeline.push({
				label: `Zwrot z eventu (${totalReturned} szt.)`,
				date: firstReturn.createdAt,
				emoji: '📦',
				kind: 'return',
				note: returnMovements.map((m) => `${m.qty}× ${m.itemName}`).join(', ')
			});
		}
		if (stratyMovements.length > 0) {
			const firstStrata = stratyMovements[0];
			const totalLost = stratyMovements.reduce((sum, m) => sum + m.qty, 0);
			timeline.push({
				label: `Straty (${totalLost} szt.)`,
				date: firstStrata.createdAt,
				emoji: '⚠️',
				kind: 'loss',
				note: stratyMovements.map((m) => `${m.qty}× ${m.itemName}`).join(', ')
			});
		}
		if (b.status === 'done') {
			timeline.push({
				label: 'Event zakończony',
				date: b.endDate ? new Date(b.endDate) : null,
				emoji: '🎉',
				kind: 'done',
				note: null
			});
		}
		// Sort chronologicznie (asc) — null daty na koniec
		timeline.sort((a, b) => {
			if (!a.date && !b.date) return 0;
			if (!a.date) return 1;
			if (!b.date) return -1;
			return a.date.getTime() - b.date.getTime();
		});

		const s = STAGES[`booking:${b.status}`] ?? STAGES['booking:confirmed'];
		zlecenie = {
			type: 'booking',
			id: b.bookingId,
			number: null,
			status: b.status,
			stageLabel: s.label,
			stageEmoji: s.emoji,
			client: b.clientId
				? {
						id: b.clientId,
						name: b.clientName ?? '—',
						company: b.clientCompany,
						phone: b.clientPhone,
						email: b.clientEmail,
						address: b.clientAddress
					}
				: null,
			event: {
				name: b.eventName,
				startDate: b.startDate,
				endDate: b.endDate,
				venue: b.venue,
				guestsCount: null
			},
			totalCents: b.priceCents,
			items: bookedItems.map((bi) => ({
				description: bi.itemName ?? 'Pozycja',
				quantity: bi.quantity,
				unitPriceCents: bi.itemPriceCents ?? 0,
				lineTotalCents: (bi.itemPriceCents ?? 0) * bi.quantity
			})),
			bookingTents: bookedItems
				.filter((bi) => bi.itemName)
				.map((bi) => ({
					tentId: bi.tentId,
					itemName: bi.itemName ?? 'Pozycja',
					quantity: bi.quantity
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
			timeline,
			photos: photosRaw.map((p) => ({
				id: p.id,
				url: p.url,
				kind: p.kind,
				caption: p.caption,
				takenBy: p.takenBy,
				takenByName: p.takenByName,
				uploadedAt: p.uploadedAt
			})),
			notes: b.notes,
			message: null,
			source: null,
			createdAt: b.createdAt,
			sentAt: null,
			viewedAt: null,
			acceptedAt: null
		};
	} else {
		throw error(400, { message: `Nieznany typ zlecenia: ${type}` });
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

	return { user: me, isAdmin: me.role === 'admin', zlecenie, availableUsers };
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
	dispatchBooking: async ({ request, params, locals }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Tylko dla bookingów' });

		const form = await request.formData();
		const dispatchNote = form.get('dispatchNote')?.toString()?.trim() || null;

		const [b] = await db.select().from(booking).where(eq(booking.id, id)).limit(1);
		if (!b) return fail(404);
		if (b.status !== 'confirmed') return fail(400, { error: 'Booking nie jest w stanie confirmed' });

		const tents = await db.select().from(bookingTent).where(eq(bookingTent.bookingId, id));
		const userId = locals.user?.id ?? null;

		// Dla każdego booking_tent — wystaw OUT wydanie_na_event (notes przechodzi na WSZYSTKIE movements)
		if (tents.length > 0) {
			await db.insert(stockMovement).values(
				tents.map((t) => ({
					itemId: t.tentId,
					direction: 'OUT',
					kind: 'wydanie_na_event',
					qty: t.quantity,
					bookingId: id,
					reason: `Wydanie na event: ${b.eventName}`,
					notes: dispatchNote,
					createdBy: userId
				}))
			);
		}

		// Append notatkę do booking.notes (historia widoczna w Notatki sekcji)
		if (dispatchNote) {
			const ts = new Date().toLocaleString('pl-PL', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
			const author = locals.user?.name ?? 'System';
			const entry = `[${ts} · ${author} · WYDANIE] ${dispatchNote}`;
			const combined = b.notes ? `${entry}\n\n${b.notes}` : entry;
			await db.update(booking).set({ notes: combined }).where(eq(booking.id, id));
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

	// ═══ Zdjęcia (v5.24) — upload + delete ═══
	uploadPhoto: async ({ request, params, locals }) => {
		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const id = compound.slice(dashIdx + 1);
		if (type !== 'booking') return fail(400, { error: 'Zdjęcia tylko do bookingu' });

		const form = await request.formData();
		const file = form.get('file');
		const kind = (form.get('kind')?.toString() ?? 'general').trim();
		const caption = form.get('caption')?.toString()?.trim() || null;

		if (!(file instanceof File) || file.size === 0) {
			return fail(400, { error: 'Brak pliku' });
		}
		if (file.size > 10 * 1024 * 1024) {
			return fail(400, { error: 'Plik za duży (max 10 MB)' });
		}
		if (!['delivery', 'return', 'damage', 'general'].includes(kind)) {
			return fail(400, { error: 'Nieprawidłowy typ' });
		}
		if (!file.type.startsWith('image/')) {
			return fail(400, { error: 'Tylko obrazy' });
		}

		// Path: static/uploads/bookings/{bookingId}/{timestamp}-{safename}
		const ts = Date.now();
		const ext = (file.name.split('.').pop() ?? 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
		const safeExt = ext.slice(0, 5) || 'jpg';
		const filename = `${ts}-${Math.random().toString(36).slice(2, 8)}.${safeExt}`;
		const dir = join(process.cwd(), 'static', 'uploads', 'bookings', id);
		await mkdir(dir, { recursive: true });
		const filepath = join(dir, filename);
		const buffer = Buffer.from(await file.arrayBuffer());
		await writeFile(filepath, buffer);

		const publicUrl = `/uploads/bookings/${id}/${filename}`;

		await db.insert(photo).values({
			bookingId: id,
			url: publicUrl,
			kind,
			caption,
			takenBy: locals.user?.id ?? null
		});
		return { success: true };
	},

	deletePhoto: async ({ request }) => {
		const form = await request.formData();
		const photoId = form.get('photoId')?.toString();
		if (!photoId) return fail(400);
		// TODO: usuń też plik z disku (na razie tylko DB row — disk-level cleanup w background job)
		await db.delete(photo).where(eq(photo.id, photoId));
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
		const returnNote = form.get('returnNote')?.toString()?.trim() || null;

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
			const itemNote = form.get(`note_${t.tentId}`)?.toString()?.trim() || null;

			if (returned > 0) {
				movements.push({
					itemId: t.tentId,
					direction: 'IN',
					kind: 'zwrot_po_evencie',
					qty: returned,
					bookingId: id,
					reason: `Zwrot po evencie: ${b.eventName}`,
					notes: itemNote ?? returnNote,
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
					notes: itemNote ?? returnNote,
					createdBy: userId
				});
			}
		}

		if (movements.length > 0) {
			await db.insert(stockMovement).values(movements);
		}

		// Append notatkę do booking.notes
		if (returnNote) {
			const ts = new Date().toLocaleString('pl-PL', {
				day: '2-digit',
				month: '2-digit',
				year: 'numeric',
				hour: '2-digit',
				minute: '2-digit'
			});
			const author = locals.user?.name ?? 'System';
			const entry = `[${ts} · ${author} · ZWROT] ${returnNote}`;
			const combined = b.notes ? `${entry}\n\n${b.notes}` : entry;
			await db.update(booking).set({ notes: combined }).where(eq(booking.id, id));
		}

		await db
			.update(booking)
			.set({ status: 'done', updatedAt: new Date() })
			.where(eq(booking.id, id));
		return { success: true };
	},

	// ═══ Wyślij ofertę email (admin, tylko dla type=offer) ═══
	sendOfferEmail: async ({ params, url }) => {
		const { getTemplate, renderTemplate, sendEmail } = await import('$lib/server/email');

		const compound = params.compoundId!;
		const dashIdx = compound.indexOf('-');
		const type = compound.slice(0, dashIdx);
		const offerId = compound.slice(dashIdx + 1);
		if (type !== 'offer') return fail(400, { error: 'Tylko dla ofert' });

		// Pobierz ofertę + klienta
		const [row] = await db
			.select({
				number: offer.number,
				eventName: offer.eventName,
				eventStartDate: offer.eventStartDate,
				eventEndDate: offer.eventEndDate,
				totalCents: offer.totalCents,
				validUntil: offer.validUntil,
				clientName: client.name,
				clientEmail: client.email
			})
			.from(offer)
			.leftJoin(client, eq(offer.clientId, client.id))
			.where(eq(offer.id, offerId))
			.limit(1);
		if (!row) return fail(404);
		if (!row.clientEmail) return fail(400, { error: 'Klient nie ma emaila' });

		const template = await getTemplate('offer_sent');
		if (!template) return fail(500, { error: 'Brak szablonu offer_sent' });

		const origin = url.origin;
		const totalZl = (row.totalCents / 100).toLocaleString('pl-PL', {
			minimumFractionDigits: 0,
			maximumFractionDigits: 0
		});
		const dateRange = row.eventStartDate === row.eventEndDate
			? row.eventStartDate
			: `${row.eventStartDate} – ${row.eventEndDate}`;

		const ctx = {
			clientName: row.clientName ?? '',
			eventName: row.eventName,
			eventDateRange: dateRange,
			offerNumber: row.number,
			totalValue: `${totalZl} zł`,
			offerLink: `${origin}/offers/${offerId}`,
			validUntil: row.validUntil ?? ''
		};

		const result = await sendEmail({
			to: row.clientEmail,
			subject: renderTemplate(template.subject, ctx),
			body: renderTemplate(template.body, ctx),
			offerId,
			template: 'offer_sent'
		});

		// Update offer.sent_at
		await db
			.update(offer)
			.set({
				status: 'sent',
				sentAt: new Date(),
				updatedAt: new Date()
			})
			.where(eq(offer.id, offerId));

		return { success: true, dev: 'dev' in result ? result.dev : false };
	}
};
