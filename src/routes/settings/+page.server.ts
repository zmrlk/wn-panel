import type { Actions, PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import { appSetting, user } from '$lib/server/db/schema';
import { asc, eq } from 'drizzle-orm';
import { fail } from '@sveltejs/kit';
import { randomUUID } from 'node:crypto';

type Company = {
	name: string;
	legalName: string;
	nip: string;
	regon: string;
	address: string;
	email: string;
	phone: string;
	website: string;
};

type Contacts = {
	replyTo: string;
	fromName: string;
	emailSignature: string;
};

type Offers = {
	prefix: string;
	year: number;
	nextNumber: number;
	validDays: number;
};

type EmailTemplate = {
	name: string;
	subject: string;
	body: string;
};
type EmailTemplates = Record<string, EmailTemplate>;

export const load: PageServerLoad = async ({ locals }) => {
	const me = locals.user ?? {
		id: 'preview',
		name: 'Denis',
		email: 'denis@wolnynamiot.pl',
		role: 'admin'
	};
	if (me.role !== 'admin') {
		const { redirect } = await import('@sveltejs/kit');
		throw redirect(303, '/dashboard');
	}

	const [settingsRows, users] = await Promise.all([
		db.select().from(appSetting),
		db
			.select({
				id: user.id,
				name: user.name,
				email: user.email,
				role: user.role,
				skills: user.skills,
				emailVerified: user.emailVerified,
				createdAt: user.createdAt
			})
			.from(user)
			.orderBy(asc(user.createdAt))
	]);

	const byKey = Object.fromEntries(settingsRows.map((s) => [s.key, s.value]));
	const company = (byKey['company'] ?? {}) as Partial<Company>;
	const contacts = (byKey['contacts'] ?? {}) as Partial<Contacts>;
	const offers = (byKey['offers'] ?? {}) as Partial<Offers>;
	const emailTemplates = (byKey['email_templates'] ?? {}) as EmailTemplates;

	return {
		user: me,
		isAdmin: me.role === 'admin',
		company,
		contacts,
		offers,
		emailTemplates,
		users
	};
};

async function upsertSetting(key: string, value: Record<string, unknown>) {
	const [existing] = await db.select().from(appSetting).where(eq(appSetting.key, key)).limit(1);
	if (existing) {
		await db.update(appSetting).set({ value, updatedAt: new Date() }).where(eq(appSetting.key, key));
	} else {
		await db.insert(appSetting).values({ key, value });
	}
}

export const actions: Actions = {
	updateCompany: async ({ request }) => {
		const form = await request.formData();
		const value = {
			name: (form.get('name') ?? '').toString(),
			legalName: (form.get('legalName') ?? '').toString(),
			nip: (form.get('nip') ?? '').toString(),
			regon: (form.get('regon') ?? '').toString(),
			address: (form.get('address') ?? '').toString(),
			email: (form.get('email') ?? '').toString(),
			phone: (form.get('phone') ?? '').toString(),
			website: (form.get('website') ?? '').toString()
		};
		await upsertSetting('company', value);
		return { success: true, section: 'company' };
	},

	updateContacts: async ({ request }) => {
		const form = await request.formData();
		const value = {
			replyTo: (form.get('replyTo') ?? '').toString(),
			fromName: (form.get('fromName') ?? '').toString(),
			emailSignature: (form.get('emailSignature') ?? '').toString()
		};
		await upsertSetting('contacts', value);
		return { success: true, section: 'contacts' };
	},

	updateOffers: async ({ request }) => {
		const form = await request.formData();
		const value = {
			prefix: (form.get('prefix') ?? 'OFF').toString(),
			year: Number(form.get('year') ?? new Date().getFullYear()),
			nextNumber: Math.max(1, Number(form.get('nextNumber') ?? '1')),
			validDays: Math.max(1, Number(form.get('validDays') ?? '14'))
		};
		await upsertSetting('offers', value);
		return { success: true, section: 'offers' };
	},

	// Zapisz wszystkie email_templates naraz (4 × name/subject/body)
	updateTemplates: async ({ request }) => {
		const form = await request.formData();
		const keys = ['thank_you', 'offer_sent', 'booking_confirmed', 'event_reminder'];
		const templates: Record<string, { name: string; subject: string; body: string }> = {};
		for (const k of keys) {
			templates[k] = {
				name: (form.get(`${k}_name`) ?? '').toString(),
				subject: (form.get(`${k}_subject`) ?? '').toString(),
				body: (form.get(`${k}_body`) ?? '').toString()
			};
		}
		await upsertSetting('email_templates', templates);
		return { success: true, section: 'templates' };
	},

	addUser: async ({ request }) => {
		const form = await request.formData();
		const name = (form.get('name') ?? '').toString().trim();
		const email = (form.get('email') ?? '').toString().trim().toLowerCase();
		const role = ((form.get('role') ?? 'employee').toString() === 'admin') ? 'admin' : 'employee';
		const skills = form.getAll('skills').map((s) => s.toString());
		if (!name || !email) return fail(400, { error: 'Podaj imię i email' });
		await db.insert(user).values({
			id: randomUUID(),
			name,
			email,
			role,
			skills,
			emailVerified: false
		});
		return { success: true, section: 'users' };
	},

	updateUser: async ({ request }) => {
		const form = await request.formData();
		const id = (form.get('id') ?? '').toString();
		const name = (form.get('name') ?? '').toString().trim();
		const role = ((form.get('role') ?? 'employee').toString() === 'admin') ? 'admin' : 'employee';
		const skills = form.getAll('skills').map((s) => s.toString());
		if (!id || !name) return fail(400);
		await db
			.update(user)
			.set({ name, role, skills, updatedAt: new Date() })
			.where(eq(user.id, id));
		return { success: true, section: 'users' };
	},

	deleteUser: async ({ request }) => {
		const form = await request.formData();
		const id = (form.get('id') ?? '').toString();
		if (!id) return fail(400);
		await db.delete(user).where(eq(user.id, id));
		return { success: true, section: 'users' };
	}
};
