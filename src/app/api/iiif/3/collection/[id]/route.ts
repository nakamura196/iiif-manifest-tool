import { NextRequest, NextResponse } from 'next/server';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { getAuthUser } from '@/lib/auth-helpers';
import { buildCollectionUrl, normalizeCollectionItems } from '@/lib/iiif-ids';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getAuthUser(request);

    // Parse the collection ID: userId_collectionId
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 2) {
      return NextResponse.json({ error: 'Invalid collection ID format' }, { status: 400 });
    }

    const [userId, collectionId] = parts;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

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

    // Build response
    collection.id = buildCollectionUrl(baseUrl, userId, collectionId, 3);

    if (collection.items) {
      collection.items = normalizeCollectionItems(collection.items, userId, collectionId, baseUrl);
    }

    delete collection['x-access'];

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
