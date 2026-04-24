import type { Handle } from '@sveltejs/kit';
import { redirect } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user } from '$lib/server/db/schema';
import { refreshTokens, verifyToken, type UserContext } from '$lib/server/auth';

/**
 * v5.54 — Keycloak SSO w miejsce cookie switcher.
 * Flow:
 *  1) kc_access cookie → verifyToken() → UserContext
 *  2) Jeśli invalid/expired → kc_refresh → refreshTokens() → set new cookies → retry verify
 *  3) Po verify: upsert user w DB (KC = source of truth dla id/email/role)
 *  4) Guard: ścieżki niepubliczne bez usera → redirect do /auth/login?return_to=…
 */

// Publiczne prefiksy — nie wymagają auth
const PUBLIC_PREFIXES = ['/auth/', '/api/health', '/api/public/', '/api/mcp/'];

function isPublicPath(pathname: string): boolean {
	return PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p));
}

function deriveRole(roles: string[]): 'admin' | 'employee' {
	return roles.includes('admin') ? 'admin' : 'employee';
}

async function upsertUser(ctx: UserContext): Promise<App.Locals['user']> {
	const kcRole = deriveRole(ctx.roles);
	const displayName = ctx.name || ctx.username || ctx.email;

	const existing = await db
		.select({
			id: user.id,
			name: user.name,
			email: user.email,
			role: user.role,
			skills: user.skills
		})
		.from(user)
		.where(eq(user.id, ctx.id))
		.limit(1);

	if (existing.length === 0) {
		await db.insert(user).values({
			id: ctx.id,
			name: displayName,
			email: ctx.email,
			emailVerified: true,
			role: kcRole,
			skills: []
		});
		return {
			id: ctx.id,
			name: displayName,
			email: ctx.email,
			role: kcRole,
			skills: []
		};
	}

	const [row] = existing;
	const needsUpdate =
		row.role !== kcRole || row.email !== ctx.email || row.name !== displayName;
	if (needsUpdate) {
		await db
			.update(user)
			.set({ role: kcRole, email: ctx.email, name: displayName, updatedAt: new Date() })
			.where(eq(user.id, ctx.id));
	}
	return {
		id: row.id,
		name: displayName,
		email: ctx.email,
		role: kcRole,
		skills: row.skills ?? []
	};
}

export const handle: Handle = async ({ event, resolve }) => {
	const { pathname, search } = event.url;

	let ctx: UserContext | null = null;
	const accessToken = event.cookies.get('kc_access');
	if (accessToken) {
		ctx = await verifyToken(accessToken);
	}

	if (!ctx) {
		const refreshToken = event.cookies.get('kc_refresh');
		if (refreshToken) {
			const tokens = await refreshTokens(refreshToken);
			if (tokens) {
				event.cookies.set('kc_access', tokens.access_token, {
					path: '/',
					httpOnly: true,
					sameSite: 'lax',
					secure: !dev,
					maxAge: tokens.expires_in
				});
				event.cookies.set('kc_refresh', tokens.refresh_token, {
					path: '/',
					httpOnly: true,
					sameSite: 'strict',
					secure: !dev,
					maxAge: tokens.refresh_expires_in
				});
				ctx = await verifyToken(tokens.access_token);
			} else {
				event.cookies.delete('kc_refresh', { path: '/' });
			}
		}
	}

	event.locals.user = ctx ? await upsertUser(ctx) : null;
	event.locals.session = null;

	if (!event.locals.user && !isPublicPath(pathname)) {
		const returnTo = encodeURIComponent(pathname + search);
		throw redirect(303, `/auth/login?return_to=${returnTo}`);
	}

	return resolve(event);
};
