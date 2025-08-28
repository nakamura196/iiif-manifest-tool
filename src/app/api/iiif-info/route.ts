import { NextRequest, NextResponse } from 'next/server';
import { Traverse } from '@iiif/parser';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import { Manifest, Collection, ContentResource } from '@iiif/presentation-3';

interface ProcessedManifest {
  url: string;
  label: string;
  thumbnail?: string;
}

// Detect IIIF version
function detectVersion(data: any): 'v2' | 'v3' | 'unknown' {
  if (data['@context']) {
    const context = Array.isArray(data['@context']) ? data['@context'].join(' ') : data['@context'];
    if (context.includes('presentation/3')) return 'v3';
    if (context.includes('presentation/2')) return 'v2';
  }
  if (data.type && !data['@type']) return 'v3';
  if (data['@type']) return 'v2';
  return 'unknown';
}

// Extract label from v3 format
function extractLabelFromV3(label: any): string {
  if (!label) return 'Untitled';
  if (typeof label === 'string') return label;
  
  // Handle language map
  if (label && typeof label === 'object' && !Array.isArray(label)) {
    // Try Japanese first, then English, then any language
    if (label.ja && label.ja[0]) return label.ja[0];
    if (label.en && label.en[0]) return label.en[0];
    if (label.none && label.none[0]) return label.none[0];
    
    const firstLang = Object.keys(label)[0];
    if (firstLang && Array.isArray(label[firstLang]) && label[firstLang][0]) {
      return label[firstLang][0];
    }
  }
  
  return 'Untitled';
}

// Extract thumbnail from v3 format
function extractThumbnailFromV3(thumbnail: any): string | undefined {
  if (!thumbnail) return undefined;
  
  // Handle array of thumbnails
  if (Array.isArray(thumbnail) && thumbnail[0]) {
    const first = thumbnail[0];
    if (typeof first === 'string') return first;
    if (first.id) return first.id;
    if (first.body?.id) return first.body.id;
  }
  
  // Handle single thumbnail
  if (typeof thumbnail === 'string') return thumbnail;
  if (thumbnail.id) return thumbnail.id;
  if (thumbnail.body?.id) return thumbnail.body.id;
  
  return undefined;
}

// Convert any IIIF resource to v3
function convertToV3(data: any): Manifest | Collection {
  const version = detectVersion(data);
  
  if (version === 'v3') {
    // Already v3, just validate
    const traverser = Traverse.create(data);
    return traverser.getResource() as Manifest | Collection;
  } else if (version === 'v2') {
    // Convert v2 to v3
    return convertPresentation2(data) as Manifest | Collection;
  } else {
    throw new Error('Unknown IIIF version');
  }
}

export async function POST(request: NextRequest) {
  try {
    const { url, type = 'info' } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch resource' }, { status: 400 });
    }

    const rawData = await response.json();
    
    // Convert to v3 for consistent processing
    let v3Data: Manifest | Collection;
    try {
      v3Data = convertToV3(rawData);
    } catch (error) {
      console.error('Failed to convert to v3:', error);
      // Fall back to raw data if conversion fails
      v3Data = rawData;
    }
    
    if (type === 'collection') {
      const collection = v3Data as Collection;
      
      // Process v3 collection items
      const items = collection.items || [];
      const processedManifests: ProcessedManifest[] = items.map((item: any) => {
        // Extract manifest URL
        let manifestUrl = item.id || '';
        
        // Extract label
        const label = extractLabelFromV3(item.label);
        
        // Extract thumbnail
        const thumbnail = extractThumbnailFromV3(item.thumbnail);
        
        return {
          url: manifestUrl,
          label,
          thumbnail
        };
      });
      
      return NextResponse.json({ 
        manifests: processedManifests,
        collectionLabel: extractLabelFromV3(collection.label)
      });
    }
    
    if (type === 'manifest') {
      // Return the converted v3 manifest
      return NextResponse.json(v3Data);
    }
    
    // Default: return converted data
    return NextResponse.json(v3Data);
  } catch (error) {
    console.error('Error fetching IIIF resource:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IIIF resource' },
      { status: 500 }
    );
  }
}