import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { db } from '@/lib/db';
import { profiles } from '@/lib/db/schema';
import { eq } from 'drizzle-orm';
import bcrypt from 'bcryptjs';

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const email = credentials.email as string;
        const password = credentials.password as string;

        const [user] = await db
          .select()
          .from(profiles)
          .where(eq(profiles.email, email.toLowerCase()))
          .limit(1);

        if (!user) return null;
        if (user.status === 'suspended') return null;

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) return null;

        return {
          id: user.id,
          email: user.email,
          name: user.displayName,
          image: user.avatarUrl,
        };
      },
    }),
  ],
  session: { strategy: 'jwt' },
  pages: {
    signIn: '/login',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }

      // Fetch fresh role from DB on each token refresh
      if (token.id) {
        const [profile] = await db
          .select({
            role: profiles.role,
            displayName: profiles.displayName,
            handle: profiles.handle,
            avatarUrl: profiles.avatarUrl,
            status: profiles.status,
          })
          .from(profiles)
          .where(eq(profiles.id, token.id as string))
          .limit(1);

        if (profile) {
          token.role = profile.role;
          token.displayName = profile.displayName;
          token.handle = profile.handle;
          token.avatarUrl = profile.avatarUrl;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        const u = session.user as unknown as Record<string, unknown>;
        u.id = token.id;
        u.role = token.role;
        u.displayName = token.displayName;
        u.handle = token.handle;
        u.avatarUrl = token.avatarUrl;
      }
      return session;
    },
    async authorized({ request, auth }) {
      const { pathname } = request.nextUrl;

      // Protected routes
      const protectedPaths = ['/dashboard', '/messages', '/settings'];
      const isProtected = protectedPaths.some((p) => pathname.startsWith(p));
      if (isProtected && !auth?.user) return false;

      // Admin routes
      if (pathname.startsWith('/admin')) {
        if (!auth?.user) return false;
        const user = auth.user as Record<string, unknown>;
        if (user.role !== 'admin') {
          return Response.redirect(new URL('/discover', request.nextUrl.origin));
        }
      }

      // Redirect logged-in users away from auth pages
      const authPaths = ['/login', '/register', '/forgot-password'];
      if (authPaths.includes(pathname) && auth?.user) {
        return Response.redirect(new URL('/discover', request.nextUrl.origin));
      }

      return true;
    },
  },
});
