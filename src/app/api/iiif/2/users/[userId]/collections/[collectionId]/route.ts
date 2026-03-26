import { NextRequest, NextResponse } from 'next/server';
import { getIIIFCollection } from '@/lib/iiif-collection';
import { getAuthUser } from '@/lib/auth-helpers';
import { buildCollectionUrl, normalizeCollectionItems } from '@/lib/iiif-ids';

interface RouteParams {
  params: Promise<{ userId: string; collectionId: string }>;
}

type IIIFV2Label = string | Array<{ "@language": string; "@value": string }>;

interface IIIFV2Collection {
  "@context": string;
  "@id": string;
  "@type": string;
  label: IIIFV2Label;
  description?: string;
  manifests?: Array<{
    "@id": string;
    "@type": string;
    label: IIIFV2Label;
  }>;
  collections?: Array<{
    "@id": string;
    "@type": string;
    label: IIIFV2Label;
  }>;
  metadata?: Array<{
    label: IIIFV2Label;
    value: IIIFV2Label;
  }>;
  attribution?: string;
  license?: string;
}

interface V3Collection {
  id: string;
  label: string | { [key: string]: string[] };
  summary?: string | { [key: string]: string[] };
  metadata?: Array<{
    label: string | { [key: string]: string[] };
    value: string | { [key: string]: string[] };
  }>;
  attribution?: string;
  rights?: string;
  items?: Array<{
    id: string;
    type: string;
    label: string | { [key: string]: string[] };
  }>;
}

function convertToV2Collection(v3Collection: V3Collection): IIIFV2Collection {
  const convertLabel = (v3Label: string | { [key: string]: string[] }): IIIFV2Label => {
    if (typeof v3Label === 'string') {
      return v3Label;
    }
    const result = [];
    for (const [lang, values] of Object.entries(v3Label)) {
      if (values && values.length > 0) {
        result.push({
          "@language": lang,
          "@value": values[0]
        });
      }
    }
    return result.length > 0 ? result : "";
  };

  const v2Collection: IIIFV2Collection = {
    "@context": "http://iiif.io/api/presentation/2/context.json",
    "@id": v3Collection.id.replace('/api/iiif/3/', '/api/iiif/2/'),
    "@type": "sc:Collection",
    "label": convertLabel(v3Collection.label),
  };

  if (v3Collection.summary) {
    const summary = v3Collection.summary;
    if (typeof summary === 'object' && 'ja' in summary) {
      const localizedSummary = summary as { [key: string]: string[] };
      v2Collection.description = localizedSummary.ja?.[0] || localizedSummary.en?.[0] || '';
    } else if (typeof summary === 'string') {
      v2Collection.description = summary;
    }
  }

  if (v3Collection.metadata) {
    v2Collection.metadata = v3Collection.metadata.map(item => ({
      label: convertLabel(item.label),
      value: convertLabel(item.value)
    }));
  }

  if (v3Collection.attribution) {
    v2Collection.attribution = v3Collection.attribution;
  }

  if (v3Collection.rights) {
    v2Collection.license = v3Collection.rights;
  }

  if (v3Collection.items && v3Collection.items.length > 0) {
    v2Collection.manifests = v3Collection.items
      .filter((item) => item.type === 'Manifest')
      .map((item) => ({
        "@id": item.id.replace('/api/iiif/3/', '/api/iiif/2/'),
        "@type": "sc:Manifest",
        "label": convertLabel(item.label)
      }));
  }

  return v2Collection;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, collectionId } = await params;
    const session = await getAuthUser(request);
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

    // Update IDs using shared utility (RESTful format)
    collection.id = buildCollectionUrl(baseUrl, userId, collectionId, 3);

    if (collection.items) {
      collection.items = normalizeCollectionItems(collection.items, userId, collectionId, baseUrl) as typeof collection.items;
    }

    // Remove internal access control fields before converting
    delete collection['x-access'];

    // Convert to v2 format
    const v2Collection = convertToV2Collection(collection);

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
