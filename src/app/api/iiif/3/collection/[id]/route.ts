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
        // Extract the item-only ID from various URL/path formats
        let itemOnlyId: string | null = null;

        if (item.manifestId) {
          const prefix = `${userId}_${collectionId}_`;
          if (item.manifestId.startsWith(prefix)) {
            itemOnlyId = item.manifestId.slice(prefix.length);
          } else {
            itemOnlyId = item.manifestId;
          }
        }

        if (!itemOnlyId && item.id) {
          // Format: .../items/{itemId}/manifest.json (S3 path)
          const s3Match = item.id.match(/\/items\/([^\/]+)\/manifest/);
          if (s3Match) {
            itemOnlyId = s3Match[1];
          }
        }

        if (!itemOnlyId && item.id) {
          // Format: .../api/iiif/3/{combinedId}/manifest or .../api/iiif/{combinedId}/manifest
          const apiMatch = item.id.match(/\/api\/iiif\/(?:3\/)?([^\/]+)\/manifest/);
          if (apiMatch) {
            const combinedId = apiMatch[1];
            // combinedId may be: userId_collectionId_itemId
            // We need to strip the userId_collectionId_ prefix if present
            const prefix = `${userId}_${collectionId}_`;
            if (combinedId.startsWith(prefix)) {
              itemOnlyId = combinedId.slice(prefix.length);
            } else {
              // May just be the itemId itself
              itemOnlyId = combinedId;
            }
          }
        }

        // Fallback
        if (!itemOnlyId) {
          const segments = item.id.split('/').filter((s: string) => s && s !== 'manifest' && s !== 'manifest.json');
          itemOnlyId = segments.pop() || item.id;
        }

        const combinedId = `${userId}_${collectionId}_${itemOnlyId}`;

        return {
          id: `${baseUrl}/api/iiif/3/${combinedId}/manifest`,
          type: 'Manifest',
          label: item.label,
          ...(item.summary ? { summary: item.summary } : {}),
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