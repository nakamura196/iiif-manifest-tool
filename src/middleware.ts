import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, mirador, static assets, icons, OGP images, and docs images
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/mirador') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/docs/images/') ||
    pathname.includes('/favicon') ||
    pathname.includes('/icon') ||
    pathname.match(/\/ogp-[a-z]{2}\.svg$/) // Match OGP images like /ogp-ja.svg, /ogp-en.svg
  ) {
    return NextResponse.next();
  }

  // Apply intl middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon|icon|ogp-[a-z]{2}\\.svg|docs/images).*)']
};