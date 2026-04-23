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
import { asc, desc, eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';
import { getStage, type ZlecenieType } from '$lib/booking-stages';
import { buildBookingTimeline } from '$lib/booking-timeline';
import { parseCompoundId } from '$lib/compound-id';
import * as bookingActions from '$lib/server/services/booking-actions';

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

	// Parse + walidacja compound ID (pure helper, 9 testów unit)
	const parsed = parseCompoundId(params.compoundId);
	if (!parsed.ok) {
		if (parsed.error === 'format') {
			throw error(400, { message: 'Nieprawidłowy format id zlecenia' });
		}
		if (parsed.error === 'type') {
			throw error(400, { message: 'Nieznany typ zlecenia' });
		}
		// uuid — pg rzuciłby 22P02 i leakował stacktrace
		throw error(404, { message: 'Zlecenie nie istnieje' });
	}
	const { type, id } = parsed;

	type Zlecenie = {
		type: ZlecenieType;
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

	// STAGES map wyniesiony do $lib/booking-stages (single source of truth, +24 testów)
	let zlecenie: Zlecenie;

	if (type === 'lead') {
		const [l] = await db.select().from(lead).where(eq(lead.id, id)).limit(1);
		if (!l) throw error(404, { message: 'Lead nie istnieje' });
		const s = getStage('lead', l.status);
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
		const s = getStage('offer', o.offer.status);
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

		// Multi-source timeline — pure builder w $lib/booking-timeline (19 testów unit)
		const timeline = buildBookingTimeline({
			bookingCreatedAt: b.createdAt,
			bookingEndDate: b.endDate,
			bookingStatus: b.status,
			assignments: assignmentsRaw.map((a) => ({
				userName: a.userName,
				task: a.task,
				notes: a.notes
			})),
			movements: movementsRaw.map((m) => ({
				kind: m.kind,
				qty: m.qty,
				itemName: m.itemName,
				createdAt: m.createdAt
			})),
			payments: payments.map((p) => ({
				amountCents: p.amountCents,
				method: p.method,
				paidAt: p.paidAt,
				notes: p.notes
			})),
			photos: photosRaw.map((p) => ({
				kind: p.kind,
				caption: p.caption,
				uploadedAt: p.uploadedAt
			}))
		});

		const s = getStage('booking', b.status);
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

/**
 * Actions delegują do $lib/server/services/booking-actions.
 * Każdy handler w osobnym module, testowalny bez SvelteKit harness.
 */
export const actions: Actions = {
	updateStatus: bookingActions.updateStatus,
	addNote: bookingActions.addNote,
	dispatchBooking: bookingActions.dispatchBooking,
	assignUser: bookingActions.assignUser,
	unassignUser: bookingActions.unassignUser,
	uploadPhoto: bookingActions.uploadPhoto,
	deletePhoto: bookingActions.deletePhoto,
	addPayment: bookingActions.addPayment,
	deletePayment: bookingActions.deletePayment,
	returnBooking: bookingActions.returnBooking,
	sendOfferEmail: bookingActions.sendOfferEmail
};

