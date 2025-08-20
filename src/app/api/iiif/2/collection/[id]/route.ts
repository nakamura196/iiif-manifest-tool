import { NextRequest, NextResponse } from 'next/server';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface IIIFV2Collection {
  "@context": string;
  "@id": string;
  "@type": string;
  label: string | { [key: string]: string[] };
  description?: string;
  manifests?: Array<{
    "@id": string;
    "@type": string;
    label: string | { [key: string]: string[] };
  }>;
  collections?: Array<{
    "@id": string;
    "@type": string;
    label: string | { [key: string]: string[] };
  }>;
  metadata?: Array<{
    label: string | { [key: string]: string[] };
    value: string | { [key: string]: string[] };
  }>;
  attribution?: string;
  license?: string;
}

// Convert IIIF v3 collection to v2 format
function convertToV2Collection(v3Collection: any): IIIFV2Collection {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  
  const v2Collection: IIIFV2Collection = {
    "@context": "http://iiif.io/api/presentation/2/context.json",
    "@id": v3Collection.id.replace('/api/iiif/3/', '/api/iiif/2/'),
    "@type": "sc:Collection",
    "label": v3Collection.label,
  };

  // Add description if present
  if (v3Collection.summary) {
    const summary = v3Collection.summary;
    if (typeof summary === 'object' && 'ja' in summary) {
      const localizedSummary = summary as { [key: string]: string[] };
      v2Collection.description = localizedSummary.ja?.[0] || localizedSummary.en?.[0] || '';
    } else if (typeof summary === 'string') {
      v2Collection.description = summary;
    }
  }

  // Add metadata
  if (v3Collection.metadata) {
    v2Collection.metadata = v3Collection.metadata;
  }

  // Add attribution
  if (v3Collection.attribution) {
    v2Collection.attribution = v3Collection.attribution;
  }

  // Add rights as license
  if (v3Collection.rights) {
    v2Collection.license = v3Collection.rights;
  }

  // Convert items to manifests
  if (v3Collection.items && v3Collection.items.length > 0) {
    v2Collection.manifests = v3Collection.items
      .filter((item: any) => item.type === 'Manifest')
      .map((item: any) => ({
        "@id": item.id.replace('/api/iiif/', '/api/iiif/2/'),
        "@type": "sc:Manifest",
        "label": item.label
      }));
  }

  return v2Collection;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const session = await getServerSession(authOptions);
    
    // Parse the collection ID to extract userId and collectionId
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
    
    // Update item references
    if (collection.items) {
      collection.items = collection.items.map((item) => {
        let manifestId = item.manifestId;
        
        // If no manifestId, extract from the S3 URL
        if (!manifestId && item.id) {
          const match = item.id.match(/\/items\/([^\/]+)\/manifest\.json/);
          if (match) {
            manifestId = match[1];
          }
        }
        
        // Fallback to extracting from the end of the URL
        if (!manifestId) {
          manifestId = item.id.split('/').pop()?.replace('.json', '') || item.id;
        }
        
        // Check if manifestId already contains the full combined ID format
        let combinedId: string;
        if (manifestId.includes('_') && manifestId.split('_').length === 3) {
          // Already in combined format, use as is
          combinedId = manifestId;
        } else {
          // Just the item ID, need to create combined format
          combinedId = `${userId}_${collectionId}_${manifestId}`;
        }
        
        return {
          id: `${baseUrl}/api/iiif/${combinedId}/manifest`,
          type: 'Manifest',
          label: item.label
        };
      });
    }

    // Remove internal access control fields before converting
    delete collection['x-access'];

    // Convert to v2 format
    const v2Collection = convertToV2Collection(collection);

    // Return the collection manifest
    return NextResponse.json(v2Collection, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/2/context.json"',
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