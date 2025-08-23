import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, mirador, static assets, icons, and OGP images
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/mirador') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon.ico') ||
    pathname.includes('/icon.svg') ||
    pathname.match(/\/ogp-[a-z]{2}\.svg$/) // Match OGP images like /ogp-ja.svg, /ogp-en.svg
  ) {
    return NextResponse.next();
  }

  // Apply intl middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|icon.svg|ogp-[a-z]{2}\\.svg).*)']
};