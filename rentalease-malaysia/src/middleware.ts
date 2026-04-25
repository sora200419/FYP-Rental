import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function middleware(req) {
    const token = req.nextauth.token;
    const pathname = req.nextUrl.pathname;

    if (
      pathname.startsWith('/dashboard/landlord') &&
      token?.role !== 'LANDLORD'
    ) {
      return NextResponse.redirect(new URL('/dashboard/tenant', req.url));
    }

    if (pathname.startsWith('/dashboard/tenant') && token?.role !== 'TENANT') {
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
