import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { user, booking, bookingAssignment, client } from '$lib/server/db/schema';
import { and, asc, eq, gte, lte, ne } from 'drizzle-orm';
import { redirect } from '@sveltejs/kit';

/**
 * /team — widok grafiku zespołu (admin only).
 * Pokazuje każdego pracownika (role=admin lub skills.length>0) + jego przypisania.
 * Eventy w zakresie ostatnich 7 dni + następne 30.
 */
export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		role: 'admin',
		email: 'denis@wolnynamiot.pl'
	};
	if (me.role !== 'admin') throw redirect(303, '/dashboard');

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const rangeStart = new Date(today);
	rangeStart.setDate(today.getDate() - 7);
	const rangeEnd = new Date(today);
	rangeEnd.setDate(today.getDate() + 30);
	const startIso = rangeStart.toISOString().slice(0, 10);
	const endIso = rangeEnd.toISOString().slice(0, 10);
	const todayIso = today.toISOString().slice(0, 10);

	// Wszyscy pracownicy + admini
	const allUsers = await db
		.select({
			id: user.id,
			name: user.name,
			role: user.role,
			skills: user.skills
		})
		.from(user)
		.orderBy(asc(user.name));

	// Wszystkie przypisania w zakresie z bookingiem
	const allAssignments = await db
		.select({
			id: bookingAssignment.id,
			userId: bookingAssignment.userId,
			task: bookingAssignment.task,
			bookingId: booking.id,
			eventName: booking.eventName,
			startDate: booking.startDate,
			endDate: booking.endDate,
			venue: booking.venue,
			status: booking.status,
			clientName: client.name,
			clientPhone: client.phone
		})
		.from(bookingAssignment)
		.innerJoin(booking, eq(bookingAssignment.bookingId, booking.id))
		.leftJoin(client, eq(booking.clientId, client.id))
		.where(
			and(
				gte(booking.startDate, startIso),
				lte(booking.startDate, endIso),
				ne(booking.status, 'cancelled')
			)
		)
		.orderBy(asc(booking.startDate));

	// Grupowanie per user + liczenie stats
	type Assignment = typeof allAssignments[number];
	const teamGrouped = allUsers.map((u) => {
		const mine = allAssignments.filter((a) => a.userId === u.id);
		const upcomingCount = mine.filter((a) => a.startDate >= todayIso).length;
		const todayCount = mine.filter((a) => a.startDate <= todayIso && a.endDate >= todayIso).length;
		return {
			user: u,
			assignments: mine,
			upcomingCount,
			todayCount
		};
	});

	// Conflict detection — user z 2+ eventami tego samego dnia
	const conflicts: Array<{ userId: string; date: string; events: Assignment[] }> = [];
	for (const t of teamGrouped) {
		const byDate = new Map<string, Assignment[]>();
		for (const a of t.assignments) {
			const d = a.startDate;
			if (!byDate.has(d)) byDate.set(d, []);
			byDate.get(d)!.push(a);
		}
		for (const [d, evs] of byDate) {
			if (evs.length > 1) conflicts.push({ userId: t.user.id, date: d, events: evs });
		}
	}

	return {
		user: me,
		isAdmin: true,
		team: teamGrouped,
		conflicts,
		todayIso,
		rangeStartIso: startIso,
		rangeEndIso: endIso
	};
};
