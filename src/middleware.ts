import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

const JOSHUA_TREE_SUFFIX = '@thejoshuatree.org';

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  if (pathname === '/admin/signin') return NextResponse.next();

  if (pathname.startsWith('/supervisor')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      const signIn = new URL('/training/signin', request.url);
      signIn.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signIn);
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/admin')) {
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token) {
      const signIn = new URL('/admin/signin', request.url);
      signIn.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signIn);
    }
  }

  if (pathname.startsWith('/training')) {
    const publicPaths = new Set([
      '/training/signin',
      '/training/account-ineligible',
    ]);
    if (publicPaths.has(pathname)) {
      return NextResponse.next();
    }

    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (!token?.email) {
      const signIn = new URL('/training/signin', request.url);
      signIn.searchParams.set('callbackUrl', pathname);
      return NextResponse.redirect(signIn);
    }
    const email = String(token.email).toLowerCase();
    const isTrainingAdmin = !!token.isTrainingAdmin;
    if (!isTrainingAdmin && !email.endsWith(JOSHUA_TREE_SUFFIX)) {
      const u = new URL('/training/account-ineligible', request.url);
      u.searchParams.set('reason', 'domain');
      return NextResponse.redirect(u);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin', '/admin/:path*', '/training', '/training/:path*', '/supervisor', '/supervisor/:path*'],
};
