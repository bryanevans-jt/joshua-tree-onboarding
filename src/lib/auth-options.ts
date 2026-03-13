import type { NextAuthOptions } from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import { isApprovedAdmin } from '@/lib/approved-admins';
import { SUPERADMIN_EMAIL } from '@/lib/auth';

function getAllowedDomains(): string[] {
  const primaryDomain = SUPERADMIN_EMAIL.split('@')[1] || '';
  const extra = process.env.TRAINING_ALLOWED_DOMAINS || '';
  const extras = extra
    .split(',')
    .map((d) => d.trim().toLowerCase())
    .filter(Boolean);
  const all = [primaryDomain.toLowerCase(), ...extras].filter(Boolean);
  // Deduplicate
  return Array.from(new Set(all));
}

function isAllowedDomain(email: string | null | undefined): boolean {
  if (!email) return false;
  const lower = email.toLowerCase();
  const domain = lower.split('@')[1];
  if (!domain) return false;
  const allowed = getAllowedDomains();
  return allowed.includes(domain);
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

      // Always allow approved admins (including superadmin) so existing admin
      // access continues to work as before.
      const isAdmin = await isApprovedAdmin(email);
      if (isAdmin) return true;

      // For non-admin users (training modules), require an allowed domain.
      if (!isAllowedDomain(email)) return false;

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
