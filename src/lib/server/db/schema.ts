import { pgTable, text, timestamp, boolean, integer, date, jsonb, uuid, primaryKey } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// ─────────────────────────────────────────────────────────────
// Better Auth tables (user, session, account, verification)
// ─────────────────────────────────────────────────────────────

export const user = pgTable('user', {
	id: text('id').primaryKey(),
	name: text('name').notNull(),
	email: text('email').notNull().unique(),
	emailVerified: boolean('email_verified').notNull().default(false),
	image: text('image'),
	role: text('role').notNull().default('employee'), // admin | employee
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const session = pgTable('session', {
	id: text('id').primaryKey(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	token: text('token').notNull().unique(),
	expiresAt: timestamp('expires_at').notNull(),
	ipAddress: text('ip_address'),
	userAgent: text('user_agent'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const account = pgTable('account', {
	id: text('id').primaryKey(),
	accountId: text('account_id').notNull(),
	providerId: text('provider_id').notNull(),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	accessToken: text('access_token'),
	refreshToken: text('refresh_token'),
	idToken: text('id_token'),
	accessTokenExpiresAt: timestamp('access_token_expires_at'),
	refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
	scope: text('scope'),
	password: text('password'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

export const verification = pgTable('verification', {
	id: text('id').primaryKey(),
	identifier: text('identifier').notNull(),
	value: text('value').notNull(),
	expiresAt: timestamp('expires_at').notNull(),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ─────────────────────────────────────────────────────────────
// Business tables
// ─────────────────────────────────────────────────────────────

// Namioty (inventory)
export const tent = pgTable('tent', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(), // np. "Namiot 10x15 granat"
	type: text('type').notNull(), // "imprezowy" | "sfera" | "cateringowy" | ...
	sizeLabel: text('size_label').notNull(), // np. "10×15m"
	widthM: integer('width_m'),
	lengthM: integer('length_m'),
	color: text('color'), // "granat" | "biały" | ...
	status: text('status').notNull().default('available'), // available | reserved | maintenance | broken
	mainPhotoUrl: text('main_photo_url'),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Klienci (CRM light)
export const client = pgTable('client', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	company: text('company'),
	phone: text('phone'),
	email: text('email'),
	address: text('address'),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Rezerwacje
export const booking = pgTable('booking', {
	id: uuid('id').primaryKey().defaultRandom(),
	clientId: uuid('client_id')
		.notNull()
		.references(() => client.id),
	eventName: text('event_name').notNull(),
	startDate: date('start_date').notNull(),
	endDate: date('end_date').notNull(),
	venue: text('venue'),
	status: text('status').notNull().default('draft'), // draft | confirmed | in-progress | done | cancelled
	priceCents: integer('price_cents'), // cena ustalona per booking (total)
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Namioty per rezerwacja (m2m)
export const bookingTent = pgTable(
	'booking_tent',
	{
		bookingId: uuid('booking_id')
			.notNull()
			.references(() => booking.id, { onDelete: 'cascade' }),
		tentId: uuid('tent_id')
			.notNull()
			.references(() => tent.id),
		quantity: integer('quantity').notNull().default(1)
	},
	(t) => ({
		pk: primaryKey({ columns: [t.bookingId, t.tentId] })
	})
);

// Galeria zdjęć z eventów
export const photo = pgTable('photo', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id').references(() => booking.id, { onDelete: 'cascade' }),
	tentId: uuid('tent_id').references(() => tent.id),
	url: text('url').notNull(), // ścieżka lokalna `/uploads/…` lub zewnętrzny URL
	tags: jsonb('tags').$type<string[]>().default([]),
	caption: text('caption'),
	uploadedAt: timestamp('uploaded_at').notNull().defaultNow()
});

// Cennik (własny, NIE ze strony)
export const pricing = pgTable('pricing', {
	id: uuid('id').primaryKey().defaultRandom(),
	tentId: uuid('tent_id')
		.notNull()
		.references(() => tent.id, { onDelete: 'cascade' }),
	pricePerDayCents: integer('price_per_day_cents').notNull(),
	notes: text('notes'),
	validFrom: date('valid_from'),
	validTo: date('valid_to'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// ─────────────────────────────────────────────────────────────
// Relations
// ─────────────────────────────────────────────────────────────

export const tentRelations = relations(tent, ({ many }) => ({
	bookingTents: many(bookingTent),
	photos: many(photo),
	pricings: many(pricing)
}));

export const clientRelations = relations(client, ({ many }) => ({
	bookings: many(booking)
}));

export const bookingRelations = relations(booking, ({ one, many }) => ({
	client: one(client, { fields: [booking.clientId], references: [client.id] }),
	bookingTents: many(bookingTent),
	photos: many(photo)
}));

export const bookingTentRelations = relations(bookingTent, ({ one }) => ({
	booking: one(booking, { fields: [bookingTent.bookingId], references: [booking.id] }),
	tent: one(tent, { fields: [bookingTent.tentId], references: [tent.id] })
}));

export const photoRelations = relations(photo, ({ one }) => ({
	booking: one(booking, { fields: [photo.bookingId], references: [booking.id] }),
	tent: one(tent, { fields: [photo.tentId], references: [tent.id] })
}));
