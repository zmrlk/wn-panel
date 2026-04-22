import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { offer, client } from '$lib/server/db/schema';
import { desc, eq } from 'drizzle-orm';

export const load: PageServerLoad = async ({ locals, url }) => {
	const user = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};

	const statusFilter = url.searchParams.get('status') ?? 'all';
	const search = url.searchParams.get('q')?.toLowerCase() ?? '';

	// Fetch all offers + client name (left join)
	const rows = await db
		.select({
			id: offer.id,
			number: offer.number,
			eventName: offer.eventName,
			eventStartDate: offer.eventStartDate,
			eventEndDate: offer.eventEndDate,
			venue: offer.venue,
			totalCents: offer.totalCents,
			status: offer.status,
			sentAt: offer.sentAt,
			viewedAt: offer.viewedAt,
			acceptedAt: offer.acceptedAt,
			validUntil: offer.validUntil,
			notes: offer.notes,
			createdAt: offer.createdAt,
			clientId: offer.clientId,
			clientName: client.name,
			clientCompany: client.company
		})
		.from(offer)
		.leftJoin(client, eq(offer.clientId, client.id))
		.orderBy(desc(offer.createdAt));

	// Count per status (for filter chips)
	const counts = { all: rows.length, draft: 0, sent: 0, viewed: 0, accepted: 0, rejected: 0, expired: 0 };
	for (const r of rows) {
		if (r.status in counts) counts[r.status as keyof typeof counts] += 1;
	}

	// Aggregate stats
	const totalPendingValueCents = rows
		.filter((r) => r.status === 'sent' || r.status === 'viewed')
		.reduce((s, r) => s + r.totalCents, 0);
	const acceptedThisMonth = rows.filter((r) => r.status === 'accepted').length;
	const conversionPct = counts.all > 0 ? Math.round((acceptedThisMonth / counts.all) * 100) : 0;

	// Apply filters
	let filtered = rows;
	if (statusFilter !== 'all') {
		filtered = filtered.filter((r) => r.status === statusFilter);
	}
	if (search) {
		filtered = filtered.filter(
			(r) =>
				r.eventName.toLowerCase().includes(search) ||
				r.number.toLowerCase().includes(search) ||
				(r.clientName ?? '').toLowerCase().includes(search)
		);
	}

	return {
		user,
		offers: filtered,
		counts,
		statusFilter,
		search,
		stats: { totalPendingValueCents, acceptedThisMonth, conversionPct }
	};
};
