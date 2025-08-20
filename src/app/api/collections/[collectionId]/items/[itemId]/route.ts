import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { getIIIFManifest, updateIIIFManifest, deleteIIIFManifest } from '@/lib/iiif-manifest';

interface RouteParams {
  params: Promise<{ collectionId: string; itemId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { collectionId, itemId } = await params;
    const session = await getServerSession(authOptions);
    
    // Get userId from session
    const userId = session?.user?.id;
    
    // For now, assume the owner is from the collection path
    // In production, you'd need to look this up properly
    const url = new URL(request.url);
    const ownerId = url.searchParams.get('ownerId') || userId;
    
    if (!ownerId) {
      return NextResponse.json({ error: 'Owner ID required' }, { status: 400 });
    }

    const manifest = await getIIIFManifest(ownerId, collectionId, itemId);
    
    if (!manifest) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 });
    }

    // Check if user has access
    const isPublic = manifest['x-access']?.isPublic ?? true;
    if (!isPublic && manifest['x-access']?.owner !== userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Convert manifest to expected format
    const images = manifest.items.map((canvas, index) => {
      const annotation = canvas.items?.[0]?.items?.[0];
      const body = annotation?.body;
      return {
        id: `image-${index}`,
        url: body?.id || '',
        width: body?.width || canvas.width,
        height: body?.height || canvas.height,
        mimeType: body?.format || 'image/jpeg',
        order: index
      };
    });

    // Extract metadata from manifest
    interface ExtractedMetadata {
      attribution?: string;
      rights?: string;
      requiredStatement?: {
        label: { [key: string]: string[] };
        value: { [key: string]: string[] };
      };
      homepage?: Array<{
        id: string;
        type: string;
        label?: { [key: string]: string[] };
      }>;
      seeAlso?: Array<{
        id: string;
        type: string;
        format?: string;
        label?: { [key: string]: string[] };
      }>;
      provider?: Array<{
        id?: string;
        type: string;
        label?: { [key: string]: string[] };
      }>;
      customFields?: Array<{
        label: string;
        value: string;
      }>;
    }
    const metadata: ExtractedMetadata = {};
    
    // Extract standard IIIF metadata fields
    if (manifest.attribution) {
      metadata.attribution = manifest.attribution;
    }
    if (manifest.rights) {
      metadata.rights = manifest.rights;
    }
    if (manifest.requiredStatement) {
      metadata.requiredStatement = manifest.requiredStatement;
    }
    if (manifest.homepage) {
      metadata.homepage = manifest.homepage;
    }
    if (manifest.seeAlso) {
      metadata.seeAlso = manifest.seeAlso;
    }
    if (manifest.provider) {
      metadata.provider = manifest.provider;
    }
    
    // Extract custom metadata fields
    if (manifest.metadata && manifest.metadata.length > 0) {
      metadata.customFields = manifest.metadata
        .filter(item => {
          // Filter out system metadata
          const label = item.label.ja?.[0] || item.label.en?.[0] || '';
          return !['作成日', 'Created', '更新日', 'Updated', 'コレクションID', 'Collection ID'].includes(label);
        })
        .map(item => ({
          label: item.label.ja?.[0] || item.label.en?.[0] || '',
          value: item.value.ja?.[0] || item.value.en?.[0] || ''
        }));
    }

    return NextResponse.json({
      id: itemId,
      title: manifest.label.ja?.[0] || manifest.label.en?.[0] || 'Untitled',
      description: manifest.summary?.ja?.[0] || manifest.summary?.en?.[0] || '',
      isPublic,
      images,
      metadata
    });
  } catch (error) {
    console.error('Error fetching item:', error);
    return NextResponse.json(
      { error: 'Failed to fetch item' },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { collectionId, itemId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify ownership by checking the manifest
    const existingManifest = await getIIIFManifest(userId, collectionId, itemId);
    if (!existingManifest || existingManifest['x-access']?.owner !== userId) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    const body = await request.json();
    const { title, description, images, isPublic, metadata, canvasAccess } = body;

    if (!title || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one image are required' },
        { status: 400 }
      );
    }

    // Update manifest in S3
    const success = await updateIIIFManifest(
      userId,
      collectionId,
      itemId,
      title,
      description,
      images,
      isPublic,
      canvasAccess,
      metadata
    );

    if (success) {
      return NextResponse.json({
        id: itemId,
        title,
        description,
        isPublic,
        images
      });
    } else {
      return NextResponse.json(
        { error: 'Failed to update item' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error updating item:', error);
    return NextResponse.json(
      { error: 'Failed to update item' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { collectionId, itemId } = await params;
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;

    // Verify ownership by checking the manifest
    const existingManifest = await getIIIFManifest(userId, collectionId, itemId);
    if (!existingManifest || existingManifest['x-access']?.owner !== userId) {
      return NextResponse.json({ error: 'Item not found or unauthorized' }, { status: 404 });
    }

    // Delete from S3
    const success = await deleteIIIFManifest(userId, collectionId, itemId);

    if (success) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json(
        { error: 'Failed to delete item' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error deleting item:', error);
    return NextResponse.json(
      { error: 'Failed to delete item' },
      { status: 500 }
    );
  }
}