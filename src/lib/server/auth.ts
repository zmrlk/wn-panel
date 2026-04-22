import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { db, schema } from './db';
import { BETTER_AUTH_SECRET, BETTER_AUTH_URL } from '$env/static/private';

export const auth = betterAuth({
	secret: BETTER_AUTH_SECRET,
	baseURL: BETTER_AUTH_URL,
	database: drizzleAdapter(db, {
		provider: 'pg',
		schema: {
			user: schema.user,
			session: schema.session,
			account: schema.account,
			verification: schema.verification
		}
	}),
	emailAndPassword: {
		enabled: true,
		requireEmailVerification: false,
		minPasswordLength: 8
	},
	session: {
		expiresIn: 60 * 60 * 24 * 30, // 30 days
		updateAge: 60 * 60 * 24 // 1 day
	},
	user: {
		additionalFields: {
			role: {
				type: 'string',
				required: false,
				defaultValue: 'employee',
				input: false
			}
		}
	},
	trustedOrigins: ['http://localhost:5173']
});

export type Auth = typeof auth;
