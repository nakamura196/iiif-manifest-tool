import { NextRequest, NextResponse } from 'next/server';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
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
    const isOwner = collection['x-access']?.owner === session?.user?.id;
    
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
        
        // If no manifestId, extract from the S3 URL
        if (!manifestId && item.id) {
          // Extract from URL like: .../items/2018583e-8940-469c-ae79-891a6d255f8a/manifest.json
          const match = item.id.match(/\/items\/([^\/]+)\/manifest\.json/);
          if (match) {
            manifestId = match[1];
          }
        }
        
        // Fallback to extracting from the end of the URL
        if (!manifestId) {
          manifestId = item.id.split('/').pop()?.replace('.json', '') || item.id;
        }
        
        const combinedId = `${userId}_${collectionId}_${manifestId}`;
        return {
          id: `${baseUrl}/api/iiif/${combinedId}/manifest`,
          type: 'Manifest',
          label: item.label
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