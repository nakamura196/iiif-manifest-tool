import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/iiif-auth';

interface BasicManifest {
  "@context": string | string[];
  "id": string;
  "type": "Manifest";
  "label": { [key: string]: string[] };
  "items": never[];
}

interface RouteParams {
  params: Promise<{ itemId: string }>;
}

// Mock manifest data for demo purposes
const mockManifest = {
  "@context": "http://iiif.io/api/presentation/3/context.json",
  "id": "https://example.org/manifest/1",
  "type": "Manifest" as const,
  "label": { "en": ["Sample Manifest"] },
  "items": []
};

function addAuthServiceToManifest(manifest: BasicManifest): BasicManifest {
  // Simple auth service addition for demo
  return {
    ...manifest,
    "@context": [
      "http://iiif.io/api/presentation/3/context.json",
      "http://iiif.io/api/auth/1/context.json"
    ]
  };
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { itemId } = await params;
    
    // For demo purposes, return a mock manifest
    let manifest: BasicManifest = { ...mockManifest, id: `https://example.org/manifest/${itemId}` };
    
    // Check for auth token
    const authHeader = request.headers.get('authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      // Add auth service to manifest and return 401
      manifest = addAuthServiceToManifest(manifest);
      return NextResponse.json(manifest, {
        status: 401,
        headers: {
          'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }

    const token = authHeader.substring(7);
    const decoded = verifyAuthToken(token);

    if (!decoded || decoded.itemId !== itemId) {
      // Invalid token, add auth service and return 401
      manifest = addAuthServiceToManifest(manifest);
      return NextResponse.json(manifest, {
        status: 401,
        headers: {
          'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
      });
    }
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching manifest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manifest' },
      { status: 500 }
    );
  }
}