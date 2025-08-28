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
      
      // Extract IIIF info from service if present (support both v2 and v3 formats)
      const service = body?.service?.[0];
      const isIIIF = !!service;
      const iiifBaseUrl = service?.['@id'] || undefined;
      
      return {
        id: `image-${index}`,
        url: body?.id || '',
        width: body?.width || canvas.width,
        height: body?.height || canvas.height,
        mimeType: body?.format || 'image/jpeg',
        order: index,
        ...(isIIIF && { isIIIF }),
        ...(iiifBaseUrl && { iiifBaseUrl })
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
        label: { [key: string]: string[] };
        value: { [key: string]: string[] };
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
    
    // Extract custom metadata fields - preserve multilingual format
    if (manifest.metadata && manifest.metadata.length > 0) {
      metadata.customFields = manifest.metadata
        .filter(item => {
          // Filter out system metadata
          const label = item.label.ja?.[0] || item.label.en?.[0] || '';
          return !['作成日', 'Created', '更新日', 'Updated', 'コレクションID', 'Collection ID'].includes(label);
        })
        .map(item => ({
          label: item.label || {},
          value: item.value || {}
        }));
    }

    // Extract location from navPlace extension
    let location = undefined;
    if (manifest.navPlace && manifest.navPlace.features && manifest.navPlace.features.length > 0) {
      const feature = manifest.navPlace.features[0];
      if (feature.geometry && feature.geometry.type === 'Point') {
        location = {
          latitude: feature.geometry.coordinates[1],
          longitude: feature.geometry.coordinates[0],
          label: feature.properties?.label?.ja?.[0] || feature.properties?.label?.en?.[0] || ''
        };
      }
    }

    return NextResponse.json({
      id: itemId,
      // Include full multilingual label and summary for v3 compatibility
      label: manifest.label,
      summary: manifest.summary,
      // Keep legacy fields for backward compatibility
      title: manifest.label.ja?.[0] || manifest.label.en?.[0] || 'Untitled',
      description: manifest.summary?.ja?.[0] || manifest.summary?.en?.[0] || '',
      isPublic,
      images,
      metadata,
      location,
      geoAnnotations: manifest['x-geo-annotations'] || {}
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
    const { 
      title, titleJa, titleEn,  // Support both old and new formats
      description, descriptionJa, descriptionEn,
      images, isPublic, metadata, canvasAccess, location, geoAnnotations 
    } = body;

    // Use multilingual titles if provided, otherwise fall back to old format
    const finalTitleJa = titleJa || title || '';
    const finalTitleEn = titleEn || title || '';
    
    // Handle descriptions as arrays
    let finalDescriptionJa: string[] = [];
    let finalDescriptionEn: string[] = [];
    
    if (Array.isArray(descriptionJa)) {
      finalDescriptionJa = descriptionJa.filter(d => d && d.trim());
    } else if (descriptionJa) {
      finalDescriptionJa = [descriptionJa];
    } else if (description) {
      finalDescriptionJa = [description];
    }
    
    if (Array.isArray(descriptionEn)) {
      finalDescriptionEn = descriptionEn.filter(d => d && d.trim());
    } else if (descriptionEn) {
      finalDescriptionEn = [descriptionEn];
    } else if (description) {
      finalDescriptionEn = [description];
    }

    if ((!finalTitleJa && !finalTitleEn) || !images || images.length === 0) {
      return NextResponse.json(
        { error: 'Title and at least one image are required' },
        { status: 400 }
      );
    }

    // Get old images to detect removals
    const oldImages: string[] = [];
    if (existingManifest.items) {
      existingManifest.items.forEach((canvas: { items?: Array<{ items?: Array<{ body?: { id: string } }> }>; thumbnail?: Array<{ id: string }> }) => {
        if (canvas.items?.[0]?.items?.[0]?.body?.id) {
          oldImages.push(canvas.items[0].items[0].body.id);
        }
        // Also collect thumbnails
        if (canvas.thumbnail?.[0]?.id) {
          oldImages.push(canvas.thumbnail[0].id);
        }
      });
    }

    // Find images that were removed
    const newImageUrls = images.flatMap((img: { url: string; thumbnailUrl?: string }) => [img.url, img.thumbnailUrl].filter(Boolean));
    const imagesToDelete = oldImages.filter(oldUrl => !newImageUrls.includes(oldUrl));

    // Delete removed images from S3
    if (imagesToDelete.length > 0) {
      fetch('/api/images/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: imagesToDelete })
      }).catch(error => {
        console.error('Failed to cleanup old images:', error);
      });
    }

    // Update manifest in S3
    const success = await updateIIIFManifest(
      userId,
      collectionId,
      itemId,
      { ja: finalTitleJa, en: finalTitleEn },
      { ja: finalDescriptionJa, en: finalDescriptionEn },
      images,
      isPublic,
      canvasAccess,
      location,
      metadata,
      geoAnnotations
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

    // Collect all image URLs to delete
    const imagesToDelete: string[] = [];
    if (existingManifest.items) {
      existingManifest.items.forEach((canvas: { items?: Array<{ items?: Array<{ body?: { id: string } }> }>; thumbnail?: Array<{ id: string }> }) => {
        if (canvas.items?.[0]?.items?.[0]?.body?.id) {
          imagesToDelete.push(canvas.items[0].items[0].body.id);
        }
        // Also collect thumbnails
        if (canvas.thumbnail?.[0]?.id) {
          imagesToDelete.push(canvas.thumbnail[0].id);
        }
      });
    }

    // Delete all images from S3
    if (imagesToDelete.length > 0) {
      fetch('/api/images/cleanup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrls: imagesToDelete })
      }).catch(error => {
        console.error('Failed to cleanup images:', error);
      });
    }

    // Delete manifest from S3
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