import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { createIIIFCollection, listUserCollections } from '@/lib/iiif-collection';
import { v4 as uuidv4 } from 'uuid';
import { IIIFCollectionResponse, IIIFTextHelpers } from '@/types/iiif';

export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const collections = await listUserCollections(session.user.id);
    // Collections are already in IIIFCollectionResponse format
    return NextResponse.json(collections);
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
    const { 
      name, 
      nameJa, 
      nameEn, 
      description, 
      descriptionJa, 
      descriptionEn, 
      isPublic = true 
    } = body;

    // Use multilingual names if provided, otherwise fall back to single name
    const finalNameJa = nameJa || name;
    const finalNameEn = nameEn || name;
    const finalDescriptionJa = descriptionJa || description;
    const finalDescriptionEn = descriptionEn || description;

    if (!finalNameJa && !finalNameEn) {
      return NextResponse.json(
        { error: 'Collection name is required' },
        { status: 400 }
      );
    }

    const collectionId = uuidv4();
    const collectionUrl = await createIIIFCollection(
      session.user.id,
      collectionId,
      {
        ja: finalNameJa || finalNameEn,
        en: finalNameEn || finalNameJa
      },
      {
        ja: finalDescriptionJa,
        en: finalDescriptionEn
      },
      isPublic
    );

    const response: IIIFCollectionResponse = {
      id: collectionId,
      label: IIIFTextHelpers.createText(finalNameJa, finalNameEn) || { none: ['Untitled'] },
      summary: IIIFTextHelpers.createText(finalDescriptionJa, finalDescriptionEn),
      isPublic,
      url: collectionUrl,
      createdAt: new Date().toISOString(),
      _count: {
        items: 0
      }
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error creating collection:', error);
    return NextResponse.json(
      { error: 'Failed to create collection' },
      { status: 500 }
    );
  }
}