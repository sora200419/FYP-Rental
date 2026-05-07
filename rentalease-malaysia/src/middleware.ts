import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;
    const role = token?.role;

    // ADMIN users go to their own dashboard; block them from landlord/tenant routes
    if (role === 'ADMIN') {
      if (!pathname.startsWith('/dashboard/admin')) {
        return NextResponse.redirect(new URL('/dashboard/admin', req.url));
      }
      return NextResponse.next();
    }

    // Block non-admins from accessing the admin dashboard
    if (pathname.startsWith('/dashboard/admin')) {
      const fallback = role === 'LANDLORD' ? '/dashboard/landlord' : '/dashboard/tenant';
      return NextResponse.redirect(new URL(fallback, req.url));
    }

    if (pathname.startsWith('/dashboard/landlord') && role !== 'LANDLORD') {
      return NextResponse.redirect(new URL('/dashboard/tenant', req.url));
    }

    if (pathname.startsWith('/dashboard/tenant') && role !== 'TENANT') {
      return NextResponse.redirect(new URL('/dashboard/landlord', req.url));
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
    pages: {
      signIn: '/login',
    },
  },
);

export const config = {
  matcher: ['/dashboard/:path*'],
};
