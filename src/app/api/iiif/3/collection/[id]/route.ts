import { NextRequest, NextResponse } from 'next/server';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { getAuthUser } from '@/lib/auth-helpers';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getAuthUser(request);
    
    // Parse the collection ID to extract userId and collectionId
    // Expected format: userId_collectionId or userId-collectionId
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid collection ID format' }, { status: 400 });
    }
    
    const [userId, collectionId] = parts;
    
    // Get collection from S3
    const collection = await getIIIFCollection(userId, collectionId);
    
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check access permissions
    const isPublic = collection['x-access']?.isPublic ?? true;
    const isOwner = collection['x-access']?.owner === session?.id;
    
    if (!isPublic && !isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Update IDs to match new URL structure
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    collection.id = `${baseUrl}/api/iiif/3/collection/${id}`;
    
    // Update item references with correct combined ID format
    if (collection.items) {
      collection.items = collection.items.map((item) => {
        let manifestId = item.manifestId;

        // If no manifestId, try to extract from various URL formats
        if (!manifestId && item.id) {
          // Format: .../items/{itemId}/manifest.json (S3 path)
          const s3Match = item.id.match(/\/items\/([^\/]+)\/manifest/);
          if (s3Match) {
            manifestId = s3Match[1];
          }

          // Format: .../api/iiif/3/{userId}_{collectionId}_{itemId}/manifest (API URL)
          if (!manifestId) {
            const apiMatch = item.id.match(/\/api\/iiif\/(?:3\/)?([^\/]+)\/manifest/);
            if (apiMatch) {
              const idPart = apiMatch[1];
              // If already combined format, extract itemId
              const parts = idPart.split('_');
              if (parts.length === 3) {
                manifestId = parts[2]; // itemId is the third part
              } else {
                manifestId = idPart;
              }
            }
          }
        }

        // Fallback: extract from the end of the URL
        if (!manifestId) {
          const segments = item.id.split('/').filter((s: string) => s && s !== 'manifest' && s !== 'manifest.json');
          manifestId = segments.pop() || item.id;
        }

        const combinedId = `${userId}_${collectionId}_${manifestId}`;

        return {
          id: `${baseUrl}/api/iiif/3/${combinedId}/manifest`,
          type: 'Manifest',
          label: item.label,
          ...(item.thumbnail ? { thumbnail: item.thumbnail } : {}),
        };
      });
    }

    // Remove internal access control fields before returning
    delete collection['x-access'];

    // Return the collection manifest
    return NextResponse.json(collection, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}