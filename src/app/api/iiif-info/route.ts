import { NextRequest, NextResponse } from 'next/server';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import { Manifest, Collection } from '@iiif/presentation-3';

interface ProcessedManifest {
  url: string;
  label: string;
  thumbnail?: string;
}

// Detect IIIF version
function detectVersion(data: unknown): 'v2' | 'v3' | 'unknown' {
  const obj = data as Record<string, unknown>;
  if (obj['@context']) {
    const context = Array.isArray(obj['@context']) ? obj['@context'].join(' ') : obj['@context'];
    if (typeof context === 'string' && context.includes('presentation/3')) return 'v3';
    if (typeof context === 'string' && context.includes('presentation/2')) return 'v2';
  }
  if (obj.type && !obj['@type']) return 'v3';
  if (obj['@type']) return 'v2';
  return 'unknown';
}

// Extract label from v3 format
function extractLabelFromV3(label: unknown): string {
  if (!label) return 'Untitled';
  if (typeof label === 'string') return label;
  
  // Handle language map
  if (label && typeof label === 'object' && !Array.isArray(label)) {
    const labelObj = label as Record<string, unknown>;
    // Try Japanese first, then English, then any language
    if (labelObj.ja && Array.isArray(labelObj.ja) && labelObj.ja[0]) return String(labelObj.ja[0]);
    if (labelObj.en && Array.isArray(labelObj.en) && labelObj.en[0]) return String(labelObj.en[0]);
    if (labelObj.none && Array.isArray(labelObj.none) && labelObj.none[0]) return String(labelObj.none[0]);
    
    const firstLang = Object.keys(labelObj)[0];
    if (firstLang && Array.isArray(labelObj[firstLang]) && (labelObj[firstLang] as unknown[])[0]) {
      return String((labelObj[firstLang] as unknown[])[0]);
    }
  }
  
  return 'Untitled';
}

// Extract thumbnail from v3 format
function extractThumbnailFromV3(thumbnail: unknown): string | undefined {
  if (!thumbnail) return undefined;
  
  // Handle array of thumbnails
  if (Array.isArray(thumbnail) && thumbnail[0]) {
    const first = thumbnail[0];
    if (typeof first === 'string') return first;
    if (typeof first === 'object' && first !== null) {
      const obj = first as Record<string, unknown>;
      if (typeof obj.id === 'string') return obj.id;
      if (obj.body && typeof obj.body === 'object' && obj.body !== null) {
        const body = obj.body as Record<string, unknown>;
        if (typeof body.id === 'string') return body.id;
      }
    }
  }
  
  // Handle single thumbnail
  if (typeof thumbnail === 'string') return thumbnail;
  if (typeof thumbnail === 'object' && thumbnail !== null) {
    const obj = thumbnail as Record<string, unknown>;
    if (typeof obj.id === 'string') return obj.id;
    if (obj.body && typeof obj.body === 'object' && obj.body !== null) {
      const body = obj.body as Record<string, unknown>;
      if (typeof body.id === 'string') return body.id;
    }
  }
  
  return undefined;
}

// Convert any IIIF resource to v3
function convertToV3(data: unknown): Manifest | Collection {
  const version = detectVersion(data);
  
  if (version === 'v3') {
    // Already v3, just return as is
    return data as Manifest | Collection;
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
      const processedManifests: ProcessedManifest[] = items.map((item: unknown) => {
        const itemObj = item as Record<string, unknown>;
        // Extract manifest URL
        const manifestUrl = (typeof itemObj.id === 'string' ? itemObj.id : '') || '';
        
        // Extract label
        const label = extractLabelFromV3(itemObj.label);
        
        // Extract thumbnail
        const thumbnail = extractThumbnailFromV3(itemObj.thumbnail);
        
        return {
          url: manifestUrl,
          label,
          thumbnail
        };
      });
      
      // Extract multilingual collection label
      const collectionLabel = collection.label;
      let collectionLabelString = '';
      
      if (collectionLabel) {
        if (typeof collectionLabel === 'string') {
          collectionLabelString = collectionLabel;
        } else if (typeof collectionLabel === 'object') {
          // Prefer Japanese, then English, then any available language
          if (collectionLabel.ja && collectionLabel.ja[0]) {
            collectionLabelString = collectionLabel.ja[0];
          } else if (collectionLabel.en && collectionLabel.en[0]) {
            collectionLabelString = collectionLabel.en[0];
          } else {
            collectionLabelString = extractLabelFromV3(collectionLabel);
          }
        }
      }
      
      return NextResponse.json({ 
        manifests: processedManifests,
        collectionLabel: collectionLabelString || 'Imported Collection',
        collectionLabelMultilingual: collectionLabel  // Also include full multilingual data
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