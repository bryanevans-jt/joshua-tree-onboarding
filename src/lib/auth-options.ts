import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { isTaggedSupervisor } from '@/lib/training-store';

const JOSHUA_TREE_SUFFIX = '@thejoshuatree.org';

function isJoshuaTreeOrgEmail(email: string | null | undefined): boolean {
  if (!email) return false;
  return email.toLowerCase().endsWith(JOSHUA_TREE_SUFFIX);
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const email = user?.email ?? null;
      if (!email) return false;

      const isAdmin = await isApprovedAdmin(email);
      if (isAdmin) return true;

      if (!isJoshuaTreeOrgEmail(email)) return false;

      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        token.email = user.email;
        token.name = user.name;
        token.isTrainingAdmin = await isApprovedAdmin(user.email);
      }
      const em = (token.email as string | undefined) ?? undefined;
      if (em) {
        token.isTrainingSupervisor = await isTaggedSupervisor(em);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.email = (token.email as string) ?? session.user.email;
        session.user.name = (token.name as string) ?? session.user.name;
        session.user.isTrainingAdmin = !!token.isTrainingAdmin;
        session.user.isTrainingSupervisor = !!token.isTrainingSupervisor;
      }
      return session;
    },
  },
  pages: {
    signIn: '/admin/signin',
    error: '/training/account-ineligible',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
