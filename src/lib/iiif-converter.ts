/**
 * IIIF v2 to v3 converter utility
 * Converts IIIF Presentation API v2 manifests/collections to v3 format
 */

interface IIIFV2Manifest {
  '@context': string | string[];
  '@id': string;
  '@type': string;
  label: string | { '@value': string } | { [key: string]: string }[];
  description?: string | { '@value': string } | { [key: string]: string }[];
  sequences?: Array<{
    '@id': string;
    canvases: Array<{
      '@id': string;
      width: number;
      height: number;
      images: Array<{
        resource: {
          '@id': string;
          '@type': string;
          format?: string;
          width?: number;
          height?: number;
        };
      }>;
    }>;
  }>;
  metadata?: Array<{
    label: string | { '@value': string };
    value: string | { '@value': string };
  }>;
  attribution?: string | string[];
  license?: string;
}

interface IIIFV3Manifest {
  '@context': string | string[];
  id: string;
  type: string;
  label: { [lang: string]: string[] };
  summary?: { [lang: string]: string[] };
  items?: Array<{
    id: string;
    type: string;
    width: number;
    height: number;
    items: Array<{
      id: string;
      type: string;
      items: Array<{
        id: string;
        type: string;
        motivation: string;
        body: {
          id: string;
          type: string;
          format?: string;
          width?: number;
          height?: number;
        };
        target: string;
      }>;
    }>;
  }>;
  metadata?: Array<{
    label: { [lang: string]: string[] };
    value: { [lang: string]: string[] };
  }>;
  requiredStatement?: {
    label: { [lang: string]: string[] };
    value: { [lang: string]: string[] };
  };
  rights?: string;
}

/**
 * Extract label from v2 format to string
 */
function extractV2Label(label: any): string {
  if (typeof label === 'string') {
    return label;
  }
  if (label && typeof label === 'object') {
    if ('@value' in label) {
      return label['@value'];
    }
    if (Array.isArray(label)) {
      const firstLabel = label[0];
      if (firstLabel) {
        if (typeof firstLabel === 'string') return firstLabel;
        if ('@value' in firstLabel) return firstLabel['@value'];
        // Handle language map
        const lang = Object.keys(firstLabel)[0];
        if (lang) return firstLabel[lang];
      }
    }
    // Handle direct language map
    const firstKey = Object.keys(label)[0];
    if (firstKey) {
      return Array.isArray(label[firstKey]) ? label[firstKey][0] : label[firstKey];
    }
  }
  return 'Untitled';
}

/**
 * Convert v2 label to v3 format
 */
function convertLabelToV3(label: any): { [lang: string]: string[] } {
  const labelStr = extractV2Label(label);
  
  // Try to detect language
  const isJapanese = /[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf\u3400-\u4dbf]/.test(labelStr);
  
  if (isJapanese) {
    return {
      ja: [labelStr],
      en: [labelStr] // Fallback to same value
    };
  } else {
    return {
      en: [labelStr],
      ja: [labelStr] // Fallback to same value
    };
  }
}

/**
 * Convert IIIF v2 manifest to v3 format
 */
export function convertManifestV2toV3(v2Manifest: any): IIIFV3Manifest {
  const v3Manifest: IIIFV3Manifest = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: v2Manifest['@id'] || v2Manifest.id,
    type: 'Manifest',
    label: convertLabelToV3(v2Manifest.label),
  };

  // Convert description
  if (v2Manifest.description) {
    v3Manifest.summary = convertLabelToV3(v2Manifest.description);
  }

  // Convert metadata
  if (v2Manifest.metadata && Array.isArray(v2Manifest.metadata)) {
    v3Manifest.metadata = v2Manifest.metadata.map(item => ({
      label: convertLabelToV3(item.label),
      value: convertLabelToV3(item.value),
    }));
  }

  // Convert attribution to requiredStatement
  if (v2Manifest.attribution) {
    v3Manifest.requiredStatement = {
      label: { en: ['Attribution'], ja: ['帰属'] },
      value: convertLabelToV3(v2Manifest.attribution),
    };
  }

  // Convert license to rights
  if (v2Manifest.license) {
    v3Manifest.rights = typeof v2Manifest.license === 'string' ? v2Manifest.license : '';
  }

  // Convert sequences/canvases to items
  if (v2Manifest.sequences && v2Manifest.sequences[0]?.canvases) {
    v3Manifest.items = v2Manifest.sequences[0].canvases.map((canvas: any, canvasIndex: number) => {
      const canvasId = canvas['@id'] || `canvas-${canvasIndex}`;
      
      const v3Canvas: any = {
        id: canvasId,
        type: 'Canvas',
        width: canvas.width || 1000,
        height: canvas.height || 1000,
        items: []
      };

      // Convert images to annotation pages
      if (canvas.images && canvas.images.length > 0) {
        v3Canvas.items = [{
          id: `${canvasId}/page`,
          type: 'AnnotationPage',
          items: canvas.images.map((image: any, imageIndex: number) => ({
            id: `${canvasId}/annotation/${imageIndex}`,
            type: 'Annotation',
            motivation: 'painting',
            body: {
              id: image.resource['@id'] || image.resource.id,
              type: 'Image',
              format: image.resource.format || 'image/jpeg',
              width: image.resource.width,
              height: image.resource.height,
            },
            target: canvasId
          }))
        }];
      }

      return v3Canvas;
    });
  }

  return v3Manifest;
}

/**
 * Check if manifest is v2 format
 */
export function isV2Manifest(manifest: any): boolean {
  return !!(manifest['@id'] && manifest['@type'] && manifest.sequences);
}

/**
 * Check if manifest is v3 format
 */
export function isV3Manifest(manifest: any): boolean {
  return !!(manifest.id && manifest.type && !manifest['@id'] && !manifest['@type']);
}

/**
 * Convert manifest to v3 if needed
 */
export function ensureV3Manifest(manifest: any): IIIFV3Manifest {
  if (isV2Manifest(manifest)) {
    return convertManifestV2toV3(manifest);
  }
  return manifest as IIIFV3Manifest;
}

/**
 * Extract common data from any version manifest
 */
export function extractManifestData(manifest: any) {
  const v3Manifest = ensureV3Manifest(manifest);
  
  const images: any[] = [];
  let description = '';
  let metadata: Array<{ label: string; value: string }> = [];
  let attribution = '';
  let license = '';

  // Extract description
  if (v3Manifest.summary) {
    const summaryLang = Object.keys(v3Manifest.summary)[0];
    if (summaryLang && v3Manifest.summary[summaryLang]) {
      description = v3Manifest.summary[summaryLang][0] || '';
    }
  }

  // Extract metadata
  if (v3Manifest.metadata) {
    metadata = v3Manifest.metadata.map(item => {
      const labelLang = Object.keys(item.label)[0];
      const valueLang = Object.keys(item.value)[0];
      return {
        label: item.label[labelLang]?.[0] || '',
        value: item.value[valueLang]?.[0] || ''
      };
    }).filter(item => item.label && item.value);
  }

  // Extract attribution from requiredStatement
  if (v3Manifest.requiredStatement?.value) {
    const valueLang = Object.keys(v3Manifest.requiredStatement.value)[0];
    attribution = v3Manifest.requiredStatement.value[valueLang]?.[0] || '';
  }

  // Extract license from rights
  license = v3Manifest.rights || '';

  // Extract images from canvases
  if (v3Manifest.items) {
    for (const canvas of v3Manifest.items) {
      if (canvas.items && canvas.items[0]?.items) {
        for (const annotation of canvas.items[0].items) {
          if (annotation.body && annotation.motivation === 'painting') {
            const body = Array.isArray(annotation.body) ? annotation.body[0] : annotation.body;
            images.push({
              url: body.id,
              width: canvas.width || body.width || 1000,
              height: canvas.height || body.height || 1000,
              mimeType: body.format || 'image/jpeg',
            });
          }
        }
      }
    }
  }

  return {
    images,
    description,
    metadata,
    attribution,
    license
  };
}