import { NextResponse } from 'next/server';

// Redirect to a signed file link without letting browsers or proxies cache the
// redirect (the link expires) or leak it in a Referer header.
export function privateRedirect(url: string): NextResponse {
  const response = NextResponse.redirect(url, 302);
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('Referrer-Policy', 'no-referrer');
  return response;
}
