import { NextRequest, NextResponse } from 'next/server';
import jwt from 'jsonwebtoken';

// IIIF Auth API v2 Probe Service
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  
  // Extract token from Bearer header
  const token = authHeader?.replace('Bearer ', '');
  
  if (!token) {
    return NextResponse.json({
      "@context": "http://iiif.io/api/auth/2/context.json",
      "type": "AuthProbeResult2",
      "status": 401,
      "heading": {
        "en": ["Authentication Required"]
      },
      "note": {
        "en": ["Please log in to access this resource"]
      },
      "location": {
        "@id": `${process.env.NEXTAUTH_URL}/api/iiif/auth/v2/login`,
        "type": "AuthAccessService2"
      }
    }, { 
      status: 200, // Probe always returns 200
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }

  try {
    // Verify JWT token
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET || 'your-jwt-secret-key-here-change-in-production'
    ) as { resourceId: string };

    // Token is valid
    return NextResponse.json({
      "@context": "http://iiif.io/api/auth/2/context.json",
      "type": "AuthProbeResult2",
      "status": 200,
      "substitute": {
        "@id": `${process.env.NEXTAUTH_URL}/api/iiif/access/${decoded.resourceId}`,
        "type": "Image"
      }
    }, {
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  } catch {
    // Invalid token
    return NextResponse.json({
      "@context": "http://iiif.io/api/auth/2/context.json",
      "type": "AuthProbeResult2",
      "status": 401,
      "heading": {
        "en": ["Invalid Token"]
      },
      "note": {
        "en": ["Your authentication token is invalid or expired"]
      },
      "location": {
        "@id": `${process.env.NEXTAUTH_URL}/api/iiif/auth/v2/login`,
        "type": "AuthAccessService2"
      }
    }, {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      }
    });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}