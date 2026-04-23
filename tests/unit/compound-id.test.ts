import { describe, it, expect } from 'vitest';
import { parseCompoundId } from '$lib/compound-id';

const VALID_UUID = '550e8400-e29b-41d4-a716-446655440000';

describe('parseCompoundId — happy path', () => {
	it('lead + UUID → ok', () => {
		const result = parseCompoundId(`lead-${VALID_UUID}`);
		expect(result).toEqual({ ok: true, type: 'lead', id: VALID_UUID });
	});

	it('offer + UUID → ok', () => {
		const result = parseCompoundId(`offer-${VALID_UUID}`);
		expect(result).toEqual({ ok: true, type: 'offer', id: VALID_UUID });
	});

	it('booking + UUID → ok', () => {
		const result = parseCompoundId(`booking-${VALID_UUID}`);
		expect(result).toEqual({ ok: true, type: 'booking', id: VALID_UUID });
	});
});

describe('parseCompoundId — błędy formatu', () => {
	it('brak myślnika → error:format', () => {
		expect(parseCompoundId('bookingabc')).toEqual({ ok: false, error: 'format' });
		expect(parseCompoundId('nomatch')).toEqual({ ok: false, error: 'format' });
		expect(parseCompoundId('')).toEqual({ ok: false, error: 'format' });
	});

	it('nieznany typ → error:type', () => {
		expect(parseCompoundId(`alien-${VALID_UUID}`)).toEqual({ ok: false, error: 'type' });
		expect(parseCompoundId(`Lead-${VALID_UUID}`)).toEqual({ ok: false, error: 'type' });
		expect(parseCompoundId(`-${VALID_UUID}`)).toEqual({ ok: false, error: 'type' });
	});

	it('invalid UUID → error:uuid', () => {
		expect(parseCompoundId('booking-not-a-uuid')).toEqual({ ok: false, error: 'uuid' });
		expect(parseCompoundId('booking-12345')).toEqual({ ok: false, error: 'uuid' });
		expect(parseCompoundId('booking-')).toEqual({ ok: false, error: 'uuid' });
	});

	it('UUID z literami w złym miejscu → error:uuid', () => {
		// Brak właściwej struktury 8-4-4-4-12
		expect(parseCompoundId('booking-550e8400e29b41d4a716446655440000')).toEqual({
			ok: false,
			error: 'uuid'
		});
	});
});

describe('parseCompoundId — case-sensitivity', () => {
	it('UUID case-insensitive', () => {
		const lowercase = parseCompoundId(`booking-${VALID_UUID.toLowerCase()}`);
		const uppercase = parseCompoundId(`booking-${VALID_UUID.toUpperCase()}`);
		expect(lowercase.ok).toBe(true);
		expect(uppercase.ok).toBe(true);
	});

	it('Typ case-sensitive (tylko lowercase)', () => {
		expect(parseCompoundId(`BOOKING-${VALID_UUID}`)).toMatchObject({ ok: false });
		expect(parseCompoundId(`Booking-${VALID_UUID}`)).toMatchObject({ ok: false });
	});
});
