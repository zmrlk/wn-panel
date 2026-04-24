/**
 * Internal HMAC token — do obejścia auth dla server-to-server calls (Gotenberg → /offers/[id]).
 *
 * Flow:
 *  - sendOfferEmail: buildPrintToken(offerId, docId) → ciąg hex
 *  - Gotenberg POSTuje URL `/offers/<id>?version=<docId>&__print=1` z header `x-internal-print-token: <hmac>`
 *  - hooks.server.ts: verifyPrintToken → jeśli valid, bypass auth guard
 *
 * Secret: SESSION_SECRET (już w env). HMAC-SHA256. Short TTL (5 min) w payloadzie.
 */
import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '$env/dynamic/private';

const DEFAULT_TTL_SEC = 300; // 5 min

function sign(payload: string): string {
	const secret = env.SESSION_SECRET ?? 'dev-session-secret';
	return createHmac('sha256', secret).update(payload).digest('hex');
}

export function buildPrintToken(offerId: string, docId: string, nowMs = Date.now()): string {
	const exp = Math.floor(nowMs / 1000) + DEFAULT_TTL_SEC;
	const payload = `${offerId}|${docId}|${exp}`;
	const sig = sign(payload);
	// Format: exp.sig (payload rekonstruowany w verify z URL params)
	return `${exp}.${sig}`;
}

export function verifyPrintToken(
	token: string,
	offerId: string,
	docId: string,
	nowMs = Date.now()
): boolean {
	if (!token || !offerId || !docId) return false;
	const parts = token.split('.');
	if (parts.length !== 2) return false;
	const [expStr, sig] = parts;
	const exp = Number(expStr);
	if (!Number.isFinite(exp)) return false;
	if (Math.floor(nowMs / 1000) > exp) return false; // expired

	const expected = sign(`${offerId}|${docId}|${expStr}`);
	if (sig.length !== expected.length) return false;
	try {
		return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'));
	} catch {
		return false;
	}
}
