import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createIIIFCollection, listUserCollections } from '@/lib/iiif-collection';
import { v4 as uuidv4 } from 'uuid';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collections = await listUserCollections(session.user.id);
    
    // Transform to match the expected format
    const formattedCollections = collections.map(col => ({
      id: col.id,
      name: col.name,
      description: col.description,
      isPublic: col.isPublic,
      createdAt: col.createdAt,
      _count: {
        items: col.itemCount
      }
    }));

    return NextResponse.json(formattedCollections);
  } catch (error) {
    console.error('Error fetching collections:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collections' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, description, isPublic = true } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    const collectionId = uuidv4();
    const collectionUrl = await createIIIFCollection(
      session.user.id,
      collectionId,
      name,
      description,
      isPublic
    );

    return NextResponse.json({
      id: collectionId,
      name,
      description,
      isPublic,
      url: collectionUrl,
      createdAt: new Date().toISOString(),
      _count: {
        items: 0
      }
    });
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}