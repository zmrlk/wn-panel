import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offer, offerItem, client } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ params, locals }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const [o] = await db
		.select({
			id: offer.id,
			number: offer.number,
			eventName: offer.eventName,
			eventStartDate: offer.eventStartDate,
			eventEndDate: offer.eventEndDate,
			venue: offer.venue,
			totalCents: offer.totalCents,
			validUntil: offer.validUntil,
			status: offer.status,
			sentAt: offer.sentAt,
			viewedAt: offer.viewedAt,
			acceptedAt: offer.acceptedAt,
			notes: offer.notes,
			createdAt: offer.createdAt,
			clientId: offer.clientId,
			clientName: client.name,
			clientCompany: client.company,
			clientPhone: client.phone,
			clientEmail: client.email,
			clientAddress: client.address
		})
		.from(offer)
		.leftJoin(client, eq(offer.clientId, client.id))
		.where(eq(offer.id, params.id))
		.limit(1);

	if (!o) throw error(404, { message: 'Oferta nie istnieje' });

	const items = await db.select().from(offerItem).where(eq(offerItem.offerId, params.id));

	return { user, offer: o, items };
};
