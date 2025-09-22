import NextAuth from 'next-auth';
import Auth0 from 'next-auth/providers/auth0';
import type { Provider } from 'next-auth/providers';


const providers: Provider[] = [
  Auth0({
    clientId: process.env.AUTH0_CLIENT_ID,
    clientSecret: process.env.AUTH0_CLIENT_SECRET,
    issuer: process.env.AUTH0_ISSUER,
  }),
];

if(!process.env.AUTH0_CLIENT_ID) { 
  console.warn('Missing environment variable "AUTH0_CLIENT_ID"');
}
if(!process.env.AUTH0_CLIENT_SECRET) {
  console.warn('Missing environment variable "AUTH0_CLIENT_SECRET"');
}


export const providerMap = providers.map((provider) => {
  if (typeof provider === 'function') {
    const providerData = provider();
      return { id: providerData.id, name: providerData.name };
  }
  return { id: provider.id, name: provider.name };
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  providers,
  
  // Trust the host - this is needed for NextAuth to work in production
  trustHost: true,
  
  secret: process.env.AUTH_SECRET,
  pages: {
    signIn: '/auth/signin',
  },
  callbacks: {
    async jwt({ token, account }) {
      // Persist the OAuth access_token to the token right after signin
      if (account) {
        token.accessToken = account.access_token;
      }
      return token;
    },
    async session({ session, token }) {
      // Send properties to the client, like an access_token from a provider.
      session.accessToken = token.accessToken as string;
      return session;
    },
    authorized({ auth: session, request: { nextUrl } }) {
      const isLoggedIn = !!session?.user;
      const isPublicPage = nextUrl.pathname.startsWith('/public');

      if (isPublicPage || isLoggedIn) {
        return true;
      }

      return false; // Redirect unauthenticated users to login page
    },
  },
});
  