/**
 * Keycloak auth — JWT verify + refresh flow.
 * Lift z VRS v2 pattern (2026-04-18 hardening).
 *
 * Fail loud w prod na brak env vars — boot-time crash > silent misconfig.
 */
import * as jose from 'jose';
import { env } from '$env/dynamic/private';
import { dev } from '$app/environment';

const ISSUER = env.KEYCLOAK_ISSUER;
const AUDIENCE = env.KEYCLOAK_CLIENT_ID;
const CLIENT_SECRET = env.KEYCLOAK_CLIENT_SECRET;

if (!dev) {
	if (!ISSUER) throw new Error('[auth] KEYCLOAK_ISSUER required in production');
	if (!AUDIENCE) throw new Error('[auth] KEYCLOAK_CLIENT_ID required in production');
	if (!CLIENT_SECRET) throw new Error('[auth] KEYCLOAK_CLIENT_SECRET required in production');
}

const JWKS = jose.createRemoteJWKSet(new URL(`${ISSUER}/protocol/openid-connect/certs`));

export type UserContext = {
	id: string; // KC subject (UUID)
	username: string;
	email: string;
	firstName: string;
	lastName: string;
	name: string; // display name
	roles: string[]; // realm roles
};

/**
 * Verify access token signature + audience.
 * Returns UserContext on success, null on failure.
 */
export async function verifyToken(token: string): Promise<UserContext | null> {
	try {
		const { payload } = await jose.jwtVerify(token, JWKS, {
			issuer: ISSUER,
			algorithms: ['RS256']
			// Audience sprawdzamy manualnie — KC zwraca `aud: "account"` + `azp: "wn-panel-app"`
		});

		// Manual audience/azp check — chroni przed cross-client token replay
		const aud = Array.isArray(payload.aud) ? payload.aud : payload.aud ? [payload.aud] : [];
		const azp = (payload as Record<string, unknown>).azp as string | undefined;
		const audOk = aud.includes(AUDIENCE) || azp === AUDIENCE;
		if (!audOk) {
			console.warn('[auth] token audience/azp mismatch:', { aud, azp, expected: AUDIENCE });
			return null;
		}

		const p = payload as Record<string, unknown>;
		const realmAccess = p.realm_access as { roles?: string[] } | undefined;
		const realmRoles = realmAccess?.roles ?? [];

		const firstName = (p.given_name as string) ?? '';
		const lastName = (p.family_name as string) ?? '';
		const username = (p.preferred_username as string) ?? '';

		return {
			id: p.sub as string,
			username,
			email: (p.email as string) ?? '',
			firstName,
			lastName,
			name: [firstName, lastName].filter(Boolean).join(' ') || username,
			roles: realmRoles
		};
	} catch {
		return null;
	}
}

export type TokenSet = {
	access_token: string;
	refresh_token: string;
	expires_in: number;
	refresh_expires_in: number;
};

/**
 * Exchange authorization code for tokens (PKCE-free confidential client).
 */
export async function exchangeCode(
	code: string,
	redirectUri: string
): Promise<TokenSet | null> {
	try {
		const body = new URLSearchParams({
			grant_type: 'authorization_code',
			client_id: AUDIENCE,
			client_secret: CLIENT_SECRET,
			code,
			redirect_uri: redirectUri
		});

		const res = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!res.ok) {
			console.warn('[auth] code exchange failed:', res.status, await res.text());
			return null;
		}
		const data = await res.json();
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
			refresh_expires_in: data.refresh_expires_in
		};
	} catch (err) {
		console.error('[auth] code exchange error:', err);
		return null;
	}
}

/**
 * Refresh access token using refresh token.
 */
export async function refreshTokens(refreshToken: string): Promise<TokenSet | null> {
	try {
		const body = new URLSearchParams({
			grant_type: 'refresh_token',
			client_id: AUDIENCE,
			client_secret: CLIENT_SECRET,
			refresh_token: refreshToken
		});

		const res = await fetch(`${ISSUER}/protocol/openid-connect/token`, {
			method: 'POST',
			headers: { 'content-type': 'application/x-www-form-urlencoded' },
			body
		});
		if (!res.ok) {
			console.warn('[auth] refresh failed:', res.status);
			return null;
		}
		const data = await res.json();
		return {
			access_token: data.access_token,
			refresh_token: data.refresh_token,
			expires_in: data.expires_in,
			refresh_expires_in: data.refresh_expires_in
		};
	} catch (err) {
		console.error('[auth] refresh error:', err);
		return null;
	}
}

/**
 * Build Keycloak authorize URL for login redirect.
 */
export function buildLoginUrl(redirectUri: string, state: string): string {
	const params = new URLSearchParams({
		client_id: AUDIENCE,
		response_type: 'code',
		scope: 'openid profile email',
		redirect_uri: redirectUri,
		state
	});
	return `${ISSUER}/protocol/openid-connect/auth?${params}`;
}

/**
 * Build Keycloak logout URL.
 */
export function buildLogoutUrl(postLogoutRedirectUri: string, idTokenHint?: string): string {
	const params = new URLSearchParams({
		post_logout_redirect_uri: postLogoutRedirectUri,
		client_id: AUDIENCE
	});
	if (idTokenHint) params.set('id_token_hint', idTokenHint);
	return `${ISSUER}/protocol/openid-connect/logout?${params}`;
}

export const AUTH_CONFIG = {
	ISSUER,
	CLIENT_ID: AUDIENCE
};
