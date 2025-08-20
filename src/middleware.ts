import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  
  // Skip middleware for API routes, mirador, and static assets
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/mirador') ||
    pathname.startsWith('/_next/') ||
    pathname.includes('/favicon.ico')
  ) {
    return NextResponse.next();
  }

  // Apply intl middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)']
};