import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import jwt from 'jsonwebtoken';

// IIIF Auth API v2 Access Service
export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const origin = url.searchParams.get('origin') || '*';
  
  const session = await getServerSession(authOptions);
  
  if (!session?.user) {
    // Return auth location for unauthenticated users
    return NextResponse.json({
      "@context": "http://iiif.io/api/auth/2/context.json",
      "type": "AuthAccessService2",
      "profile": "active",
      "label": {
        "en": ["Login to IIIF Resource"]
      },
      "heading": {
        "en": ["Please Log In"]
      },
      "note": {
        "en": ["You need to log in to access this resource"]
      },
      "confirmLabel": {
        "en": ["Login"]
      },
      "location": {
        "@id": `${process.env.NEXTAUTH_URL}/api/auth/signin`,
        "type": "AuthLoginPage"
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Credentials': 'true',
      }
    });
  }

  // Generate access token for authenticated user
  const accessToken = jwt.sign(
    { 
      userId: session.user.id,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + (60 * 60) // 1 hour
    },
    process.env.JWT_SECRET || 'your-jwt-secret-key-here-change-in-production',
    { algorithm: 'HS256' }
  );

  return NextResponse.json({
    "@context": "http://iiif.io/api/auth/2/context.json",
    "type": "AuthAccessToken2",
    "accessToken": accessToken,
    "expiresIn": 3600,
    "label": {
      "en": ["Access Token"]
    }
  }, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': origin,
      'Access-Control-Allow-Credentials': 'true',
    }
  });
}

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