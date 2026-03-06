import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isApprovedAdmin } from '@/lib/approved-admins';

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email;
      const allowed = await isApprovedAdmin(email);
      if (!allowed) return false;
      return true;
    },
    async session({ session }) {
      return session;
    },
  },
  pages: {
    signIn: '/admin/signin',
    error: '/admin/signin',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
