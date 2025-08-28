import { NextRequest, NextResponse } from 'next/server';
import { Traverse } from '@iiif/parser';
import { convertPresentation2 } from '@iiif/parser/presentation-2';
import { Manifest, Collection } from '@iiif/presentation-3';

function detectVersion(data: any): string {
  // IIIF v3 detection
  if (data['@context'] && typeof data['@context'] === 'string' && data['@context'].includes('presentation/3')) {
    return 'v3';
  }
  if (data.type && !data['@type']) {
    return 'v3';
  }
  
  // IIIF v2 detection
  if (data['@context'] && typeof data['@context'] === 'string' && data['@context'].includes('presentation/2')) {
    return 'v2';
  }
  if (data['@type']) {
    return 'v2';
  }
  
  // Check array contexts
  if (Array.isArray(data['@context'])) {
    const contexts = data['@context'].join(' ');
    if (contexts.includes('presentation/3')) return 'v3';
    if (contexts.includes('presentation/2')) return 'v2';
  }
  
  return 'unknown';
}

function getResourceType(data: any): string {
  // v3 types
  if (data.type === 'Manifest') return 'Manifest';
  if (data.type === 'Collection') return 'Collection';
  
  // v2 types
  if (data['@type'] === 'sc:Manifest') return 'Manifest';
  if (data['@type'] === 'sc:Collection') return 'Collection';
  
  return 'Unknown';
}

function getItemCount(data: any): number | undefined {
  // For manifests, count canvases
  if (data.items && Array.isArray(data.items)) {
    return data.items.length;
  }
  if (data.sequences && data.sequences[0]?.canvases) {
    return data.sequences[0].canvases.length;
  }
  
  // For collections, count manifests
  if (data.manifests) {
    return data.manifests.length;
  }
  if (data.members) {
    return data.members.length;
  }
  
  return undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, url, json } = body;

    let inputData: any;

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

    // If it's already v3, just validate it
    if (inputVersion === 'v3') {
      // Use Traverse to validate and normalize v3
      const traverser = Traverse.create(inputData);
      parsedData = traverser.getResource() as Manifest | Collection;
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