import { pgTable, text, timestamp, boolean, integer, date, jsonb, uuid, primaryKey } from 'drizzle-orm/pg-core';

// ─────────────────────────────────────────────────────────────
// App settings (k-v singletons: company, contacts, offers)
// ─────────────────────────────────────────────────────────────
export const appSetting = pgTable('app_setting', {
	key: text('key').primaryKey(),
	value: jsonb('value').$type<Record<string, unknown>>().notNull().default({}),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});
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
	skills: jsonb('skills').$type<string[]>().notNull().default([]), // ['driver', 'installer', 'lead']
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

// Items (inventory) — przemianowane z "tent", bo mamy też stoły, krzesła, oświetlenie
// Tabela nazwa zostaje "tent" dla kompatybilności migracji, ale w kodzie używamy `item`
export const item = pgTable('tent', {
	id: uuid('id').primaryKey().defaultRandom(),
	sku: text('sku').unique(),
	name: text('name').notNull(),
	itemType: text('item_type').notNull().default('tent'),
	category: text('category'),
	sizeLabel: text('size_label'),
	widthM: integer('width_m'),
	lengthM: integer('length_m'),
	color: text('color'),
	unit: text('unit').notNull().default('szt'),
	totalQty: integer('total_qty').notNull().default(1), // obecny stan magazynowy (aktualizowany przez trigger z stock_movement)
	minQty: integer('min_qty').notNull().default(0), // alert gdy stan < min
	status: text('status').notNull().default('available'),
	mainPhotoUrl: text('main_photo_url'),
	pricePerDayCents: integer('price_per_day_cents'),
	notes: text('notes'),
	archivedAt: timestamp('archived_at'), // soft delete
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// ─────────────────────────────────────────────────────────────
// Stock movements — append-only ledger (lift z STAGO warehouse_movements)
// IN: zakup, zwrot_po_evencie, korekta_plus, serwis_powrot
// OUT: wydanie_na_event, wydanie_serwis, strata, korekta_minus
// ─────────────────────────────────────────────────────────────
export const stockMovement = pgTable('stock_movement', {
	id: uuid('id').primaryKey().defaultRandom(),
	itemId: uuid('item_id')
		.notNull()
		.references(() => item.id),
	direction: text('direction').notNull(), // 'IN' | 'OUT'
	kind: text('kind').notNull(), // enum text (zakup, zwrot_po_evencie, wydanie_na_event, ...)
	qty: integer('qty').notNull(),
	priceCents: integer('price_cents'), // optional netto
	bookingId: uuid('booking_id').references(() => booking.id), // wymagane dla wydanie_na_event
	reason: text('reason'),
	notes: text('notes'),
	createdBy: text('created_by').references(() => user.id),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

export const stockMovementRelations = relations(stockMovement, ({ one }) => ({
	item: one(item, { fields: [stockMovement.itemId], references: [item.id] }),
	booking: one(booking, { fields: [stockMovement.bookingId], references: [booking.id] }),
	user: one(user, { fields: [stockMovement.createdBy], references: [user.id] })
}));
// Backward-compat alias
export const tent = item;

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

// Przypisania do bookingu — kto realizuje (v5.23 Driver Flow)
// task: 'driver' | 'installer' | 'lead' | 'other'
export const bookingAssignment = pgTable('booking_assignment', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id')
		.notNull()
		.references(() => booking.id, { onDelete: 'cascade' }),
	userId: text('user_id')
		.notNull()
		.references(() => user.id, { onDelete: 'cascade' }),
	task: text('task').notNull(),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// Płatności per booking (v5.21)
// Prostota: jedna transakcja = jeden wpis. Sumę zapłaconego liczymy SELECT SUM(amount_cents).
export const payment = pgTable('payment', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id')
		.notNull()
		.references(() => booking.id, { onDelete: 'cascade' }),
	amountCents: integer('amount_cents').notNull(),
	method: text('method').notNull(), // 'gotówka' | 'przelew' | 'inne'
	kind: text('kind').notNull().default('pełna'), // 'pełna' | 'dopłata'
	paidAt: date('paid_at').notNull(),
	receivedBy: text('received_by').references(() => user.id),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow()
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

// Galeria zdjęć z eventów (v5.24 rozszerzone o kind + taken_by)
export const photo = pgTable('photo', {
	id: uuid('id').primaryKey().defaultRandom(),
	bookingId: uuid('booking_id').references(() => booking.id, { onDelete: 'cascade' }),
	tentId: uuid('tent_id').references(() => tent.id),
	url: text('url').notNull(), // ścieżka lokalna `/uploads/…` lub zewnętrzny URL
	tags: jsonb('tags').$type<string[]>().default([]),
	caption: text('caption'),
	kind: text('kind').notNull().default('general'), // 'delivery' | 'return' | 'damage' | 'general'
	takenBy: text('taken_by').references(() => user.id),
	uploadedAt: timestamp('uploaded_at').notNull().defaultNow()
});

// Cennik itemów — override price_per_day z item.price_per_day_cents (sezonowość, rabaty)
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
// PAKIETY (hybrid pricing: pakiet jako template + customizacja)
// Z wolnynamiot.pl: 4 tier'y (Ekspres / Ekspres+stoły / Duże z montażem / Duże pełny pakiet)
// ─────────────────────────────────────────────────────────────

export const pkg = pgTable('package', {
	id: uuid('id').primaryKey().defaultRandom(),
	slug: text('slug').notNull().unique(),
	name: text('name').notNull(),
	description: text('description'),
	tier: text('tier').notNull(),
	priceFromCents: integer('price_from_cents').notNull(),
	priceToCents: integer('price_to_cents'),
	includesDelivery: boolean('includes_delivery').notNull().default(false),
	includesInstall: boolean('includes_install').notNull().default(false),
	minGuests: integer('min_guests'),
	maxGuests: integer('max_guests'),
	includes: jsonb('includes').$type<string[]>().default([]), // lista in-cluded elements
	areaM2: integer('area_m2'), // metraż
	setupMinutes: integer('setup_minutes'), // czas montażu w minutach
	deliveryType: text('delivery_type').default('self-pickup'), // 'self-pickup' | 'full-service'
	active: boolean('active').notNull().default(true),
	sortOrder: integer('sort_order').notNull().default(0),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Co wchodzi w pakiet (items z qty)
export const pkgItem = pgTable('package_item', {
	id: uuid('id').primaryKey().defaultRandom(),
	packageId: uuid('package_id')
		.notNull()
		.references(() => pkg.id, { onDelete: 'cascade' }),
	itemId: uuid('tent_id').references(() => item.id),
	customLabel: text('custom_label'), // jeśli nie item z magazynu (np. "Dostawa do 30km")
	quantity: integer('quantity').notNull().default(1),
	sortOrder: integer('sort_order').notNull().default(0)
});

export const pkgRelations = relations(pkg, ({ many }) => ({
	items: many(pkgItem)
}));
export const pkgItemRelations = relations(pkgItem, ({ one }) => ({
	package: one(pkg, { fields: [pkgItem.packageId], references: [pkg.id] }),
	item: one(item, { fields: [pkgItem.itemId], references: [item.id] })
}));

// ─────────────────────────────────────────────────────────────
// CRM — leady → oferty → rezerwacje (lift pattern ze STAGO v2)
// ─────────────────────────────────────────────────────────────

// Lead — pierwszy kontakt (formularz z strony, telefon, email)
export const lead = pgTable('lead', {
	id: uuid('id').primaryKey().defaultRandom(),
	name: text('name').notNull(),
	company: text('company'),
	phone: text('phone'),
	email: text('email'),
	source: text('source'), // 'website' | 'phone' | 'referral' | 'facebook' | 'olx' | 'other'
	eventName: text('event_name'), // "Wesele Kowalski" / "Urodziny 50"
	eventDateHint: date('event_date_hint'), // orientacyjna data
	guestsCount: integer('guests_count'),
	venueHint: text('venue_hint'),
	message: text('message'), // original message od leada
	status: text('status').notNull().default('new'), // new | contacted | qualified | quoted | won | lost | archived
	assignedTo: text('assigned_to').references(() => user.id),
	convertedToClientId: uuid('converted_to_client_id').references(() => client.id),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Oferta — wysyłana do leada lub klienta (Resend)
export const offer = pgTable('offer', {
	id: uuid('id').primaryKey().defaultRandom(),
	number: text('number').notNull().unique(), // "OFF-2026-0001"
	leadId: uuid('lead_id').references(() => lead.id),
	clientId: uuid('client_id').references(() => client.id), // może być zarówno lead jak i existing client
	eventName: text('event_name').notNull(),
	eventStartDate: date('event_start_date').notNull(),
	eventEndDate: date('event_end_date').notNull(),
	venue: text('venue'),
	totalCents: integer('total_cents').notNull(), // gross
	validUntil: date('valid_until'),
	status: text('status').notNull().default('draft'), // draft | sent | viewed | accepted | rejected | expired
	sentAt: timestamp('sent_at'),
	viewedAt: timestamp('viewed_at'),
	acceptedAt: timestamp('accepted_at'),
	convertedToBookingId: uuid('converted_to_booking_id').references(() => booking.id),
	notes: text('notes'),
	createdAt: timestamp('created_at').notNull().defaultNow(),
	updatedAt: timestamp('updated_at').notNull().defaultNow()
});

// Pozycje oferty (lift quotation line items ze STAGO v2)
export const offerItem = pgTable('offer_item', {
	id: uuid('id').primaryKey().defaultRandom(),
	offerId: uuid('offer_id')
		.notNull()
		.references(() => offer.id, { onDelete: 'cascade' }),
	tentId: uuid('tent_id').references(() => tent.id), // optional, może być nie-namiotowa pozycja (stoły, oświetlenie)
	description: text('description').notNull(), // np. "Namiot 6×12 m z montażem" / "Stół 220×80" / "Oświetlenie LED girlanda"
	quantity: integer('quantity').notNull().default(1),
	unitPriceCents: integer('unit_price_cents').notNull(),
	lineTotalCents: integer('line_total_cents').notNull() // snapshot (quantity × unit_price × days)
});

// Email log — tracking wysyłek przez Resend (bounces, opens, clicks)
export const emailLog = pgTable('email_log', {
	id: uuid('id').primaryKey().defaultRandom(),
	resendId: text('resend_id'), // ID zwrócony przez Resend API
	offerId: uuid('offer_id').references(() => offer.id),
	leadId: uuid('lead_id').references(() => lead.id),
	toEmail: text('to_email').notNull(),
	subject: text('subject').notNull(),
	template: text('template'), // 'offer_new' | 'offer_reminder' | 'booking_confirmation' | etc.
	status: text('status').notNull().default('queued'), // queued | sent | delivered | opened | clicked | bounced | failed
	sentAt: timestamp('sent_at'),
	deliveredAt: timestamp('delivered_at'),
	openedAt: timestamp('opened_at'),
	clickedAt: timestamp('clicked_at'),
	errorMessage: text('error_message'),
	createdAt: timestamp('created_at').notNull().defaultNow()
});

// Relations
export const leadRelations = relations(lead, ({ one, many }) => ({
	assignedUser: one(user, { fields: [lead.assignedTo], references: [user.id] }),
	convertedClient: one(client, { fields: [lead.convertedToClientId], references: [client.id] }),
	offers: many(offer),
	emailLogs: many(emailLog)
}));

export const offerRelations = relations(offer, ({ one, many }) => ({
	lead: one(lead, { fields: [offer.leadId], references: [lead.id] }),
	clientRef: one(client, { fields: [offer.clientId], references: [client.id] }),
	booking: one(booking, { fields: [offer.convertedToBookingId], references: [booking.id] }),
	items: many(offerItem),
	emailLogs: many(emailLog)
}));

export const offerItemRelations = relations(offerItem, ({ one }) => ({
	offer: one(offer, { fields: [offerItem.offerId], references: [offer.id] }),
	tent: one(tent, { fields: [offerItem.tentId], references: [tent.id] })
}));

export const emailLogRelations = relations(emailLog, ({ one }) => ({
	offer: one(offer, { fields: [emailLog.offerId], references: [offer.id] }),
	lead: one(lead, { fields: [emailLog.leadId], references: [lead.id] })
}));

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
	photos: many(photo),
	payments: many(payment)
}));

export const paymentRelations = relations(payment, ({ one }) => ({
	booking: one(booking, { fields: [payment.bookingId], references: [booking.id] }),
	receiver: one(user, { fields: [payment.receivedBy], references: [user.id] })
}));

export const bookingAssignmentRelations = relations(bookingAssignment, ({ one }) => ({
	booking: one(booking, { fields: [bookingAssignment.bookingId], references: [booking.id] }),
	user: one(user, { fields: [bookingAssignment.userId], references: [user.id] })
}));

export const bookingTentRelations = relations(bookingTent, ({ one }) => ({
	booking: one(booking, { fields: [bookingTent.bookingId], references: [booking.id] }),
	tent: one(tent, { fields: [bookingTent.tentId], references: [tent.id] })
}));

export const photoRelations = relations(photo, ({ one }) => ({
	booking: one(booking, { fields: [photo.bookingId], references: [booking.id] }),
	tent: one(tent, { fields: [photo.tentId], references: [tent.id] })
}));
