import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

// IIIF Auth API v1 Token Service
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const messageId = url.searchParams.get('messageId') || '';
  const origin = url.searchParams.get('origin') || '*';
  
  // Check for authentication cookie or session
  const cookieName = process.env.IIIF_AUTH_COOKIE_NAME || 'iiif-auth-token';
  const authCookie = request.cookies.get(cookieName);
  const session = await getServerSession(authOptions);
  
  if (!authCookie && !session?.user) {
    // Not authenticated
    return NextResponse.json({
      "@context": "http://iiif.io/api/auth/1/context.json",
      "@id": `${process.env.NEXTAUTH_URL}/api/iiif/auth/v1/token`,
      "type": "AuthTokenService1",
      "profile": "http://iiif.io/api/auth/1/token",
      "accessToken": null,
      "error": "missingCredentials",
      "errorDescription": "No credentials provided",
      "errorUri": `${process.env.NEXTAUTH_URL}/api/iiif/auth/v1/login`
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  }

  // Generate access token
  const userId = authCookie?.value || session?.user?.id;
  const accessToken = jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET || 'your-jwt-secret-key-here-change-in-production',
    { algorithm: 'HS256' }
  );

  return NextResponse.json({
    "@context": "http://iiif.io/api/auth/1/context.json",
    "@id": `${process.env.NEXTAUTH_URL}/api/iiif/auth/v1/token`,
    "type": "AuthTokenService1", 
    "profile": "http://iiif.io/api/auth/1/token",
    "accessToken": accessToken,
    "expiresIn": 3600,
    "messageId": messageId
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}

// OPTIONS request for CORS
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Allow-Credentials': 'true',
    },
  });
}