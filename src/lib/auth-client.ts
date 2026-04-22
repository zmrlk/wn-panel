// STUB — Better Auth wyrzucony, Keycloak pending.
// Placeholder żeby nie wysypać importów które jeszcze gdzieś zostały.
export const authClient = {
	signIn: { email: async () => ({ error: { message: 'Auth not configured' } }) },
	signUp: { email: async () => ({ error: { message: 'Auth not configured' } }) },
	signOut: async () => undefined,
	getSession: async () => null
};

export const signIn = authClient.signIn;
export const signUp = authClient.signUp;
export const signOut = authClient.signOut;
export const getSession = authClient.getSession;
export const useSession = () => ({ subscribe: () => () => undefined });
