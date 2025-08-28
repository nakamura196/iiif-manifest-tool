import { NextRequest, NextResponse } from 'next/server';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import { Manifest, Collection } from '@iiif/presentation-3';

function detectVersion(data: unknown): string {
  const obj = data as Record<string, unknown>;
  // IIIF v3 detection
  if (obj['@context'] && typeof obj['@context'] === 'string' && obj['@context'].includes('presentation/3')) {
    return 'v3';
  }
  if (obj.type && !obj['@type']) {
    return 'v3';
  }
  
  // IIIF v2 detection
  if (obj['@context'] && typeof obj['@context'] === 'string' && obj['@context'].includes('presentation/2')) {
    return 'v2';
  }
  if (obj['@type']) {
    return 'v2';
  }
  
  // Check array contexts
  if (Array.isArray(obj['@context'])) {
    const contexts = obj['@context'].join(' ');
    if (contexts.includes('presentation/3')) return 'v3';
    if (contexts.includes('presentation/2')) return 'v2';
  }
  
  return 'unknown';
}

function getResourceType(data: unknown): string {
  const obj = data as Record<string, unknown>;
  // v3 types
  if (obj.type === 'Manifest') return 'Manifest';
  if (obj.type === 'Collection') return 'Collection';
  
  // v2 types
  if (obj['@type'] === 'sc:Manifest') return 'Manifest';
  if (obj['@type'] === 'sc:Collection') return 'Collection';
  
  return 'Unknown';
}

function getItemCount(data: unknown): number | undefined {
  const obj = data as Record<string, unknown>;
  // For manifests, count canvases
  if (obj.items && Array.isArray(obj.items)) {
    return obj.items.length;
  }
  if (obj.sequences && Array.isArray(obj.sequences) && obj.sequences[0]) {
    const seq = obj.sequences[0] as Record<string, unknown>;
    if (seq.canvases && Array.isArray(seq.canvases)) {
      return seq.canvases.length;
    }
  }
  
  // For collections, count manifests
  if (obj.manifests && Array.isArray(obj.manifests)) {
    return obj.manifests.length;
  }
  if (obj.members && Array.isArray(obj.members)) {
    return obj.members.length;
  }
  
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url, json } = body;

    let inputData: unknown;

    // Fetch from URL or parse JSON
    if (type === 'url' && url) {
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch URL: ${response.status} ${response.statusText}`);
      }
      inputData = await response.json();
    } else if (type === 'json' && json) {
      try {
        inputData = JSON.parse(json);
      } catch (e) {
        throw new Error('Invalid JSON format');
      }
    } else {
      return NextResponse.json(
        { error: 'Invalid input: provide either URL or JSON' },
        { status: 400 }
      );
    }

    // Detect version and type
    const inputVersion = detectVersion(inputData);
    const resourceType = getResourceType(inputData);
    const itemCount = getItemCount(inputData);

    let parsedData: Manifest | Collection;

    // If it's already v3, just use it
    if (inputVersion === 'v3') {
      parsedData = inputData as Manifest | Collection;
    } else if (inputVersion === 'v2') {
      // Convert v2 to v3 using convertPresentation2
      try {
        parsedData = convertPresentation2(inputData) as Manifest | Collection;
      } catch (error) {
        console.error('Conversion error:', error);
        throw new Error('Failed to convert IIIF v2 to v3');
      }
    } else {
      throw new Error('Unable to detect IIIF version or invalid IIIF resource');
    }

    // Get info about the parsed result
    const outputInfo = {
      inputVersion,
      outputVersion: 'v3',
      type: resourceType,
      itemCount: itemCount || getItemCount(parsedData)
    };

    return NextResponse.json({
      parsed: parsedData,
      info: outputInfo
    });
  } catch (error) {
    console.error('IIIF Parser error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to parse IIIF resource',
        details: error instanceof Error ? error.stack : undefined
      },
      { status: 400 }
    );
  }
}