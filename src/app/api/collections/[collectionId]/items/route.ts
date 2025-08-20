import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createIIIFManifest, listCollectionItems } from '@/lib/iiif-manifest';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { requireCollectionAccess } from '@/lib/iiif-auth-check';

interface RouteParams {
  params: Promise<{ collectionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collectionId } = await params;
    const session = await getServerSession(authOptions);
    
    // Get userId from query parameter or session
    const url = new URL(request.url);
    const userId = url.searchParams.get('userId') || session?.user?.id;

    if (!userId) {
      return NextResponse.json({ error: 'User ID required' }, { status: 400 });
    }

    // Check access permissions
    const accessCheck = await requireCollectionAccess(userId, collectionId);
    if (!accessCheck.allowed) {
      return NextResponse.json(
        { error: accessCheck.error || 'Access denied' },
        { status: 403 }
      );
    }

    const items = await listCollectionItems(userId, collectionId);
    return NextResponse.json(items);
  } catch (error) {
    console.error('Error fetching items:', error);
    return NextResponse.json(
      { error: 'Failed to fetch items' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { collectionId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify the collection exists and user owns it
    const collection = await getIIIFCollection(userId, collectionId);
    if (!collection) {
      return NextResponse.json({ error: 'Collection not found' }, { status: 404 });
    }

    // Check if user is the owner
    if (collection['x-access']?.owner !== userId) {
      return NextResponse.json({ error: 'Only collection owner can add items' }, { status: 403 });
    }

    const body = await request.json();
    const { title, description, images, isPublic = true } = body;

    if (!title || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one image are required' },
        { status: 400 }
      );
    }

    // Create IIIF manifest and save to S3
    const { manifestId, manifestUrl } = await createIIIFManifest(
      userId,
      collectionId,
      title,
      description,
      images,
      isPublic
    );

    return NextResponse.json({
      id: manifestId,
      title,
      description,
      manifestUrl,
      imageCount: images.length,
      thumbnail: images[0]?.url,
      createdAt: new Date().toISOString()
    });
  } catch (error) {
    console.error('Error creating item:', error);
    return NextResponse.json(
      { error: 'Failed to create item' },
      { status: 500 }
    );
  }
}