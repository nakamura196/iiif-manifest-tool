import { NextRequest, NextResponse } from 'next/server';
import createIntlMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

const intlMiddleware = createIntlMiddleware(routing);

/** Allowed CORS origins. '*' allows all; add specific domains for production. */
const CORS_ALLOWED_ORIGINS = '*';
const CORS_ALLOWED_METHODS = 'GET, POST, PUT, PATCH, DELETE, OPTIONS';
const CORS_ALLOWED_HEADERS = 'Content-Type, Authorization, X-Requested-With';
const CORS_MAX_AGE = '86400'; // 24 hours preflight cache

function addCorsHeaders(response: NextResponse): NextResponse {
  response.headers.set('Access-Control-Allow-Origin', CORS_ALLOWED_ORIGINS);
  response.headers.set('Access-Control-Allow-Methods', CORS_ALLOWED_METHODS);
  response.headers.set('Access-Control-Allow-Headers', CORS_ALLOWED_HEADERS);
  response.headers.set('Access-Control-Max-Age', CORS_MAX_AGE);
  return response;
}

export default async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Handle CORS preflight (OPTIONS) for API routes
  if (pathname.startsWith('/api/') && request.method === 'OPTIONS') {
    const response = new NextResponse(null, { status: 204 });
    return addCorsHeaders(response);
  }

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
    const response = NextResponse.next();
    // Add CORS headers to all API responses
    if (pathname.startsWith('/api/')) {
      return addCorsHeaders(response);
    }
    return response;
  }

  // Apply intl middleware for all other routes
  return intlMiddleware(request);
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon|icon|ogp-[a-z]{2}\\.svg|docs/images).*)']
};