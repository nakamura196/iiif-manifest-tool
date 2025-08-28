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
function extractV2Label(label: unknown): string {
  if (typeof label === 'string') {
    return label;
  }
  if (label && typeof label === 'object') {
    const labelObj = label as Record<string, unknown>;
    if ('@value' in labelObj) {
      return String(labelObj['@value']);
    }
    if (Array.isArray(label)) {
      const firstLabel = label[0];
      if (firstLabel) {
        if (typeof firstLabel === 'string') return firstLabel;
        if (typeof firstLabel === 'object' && '@value' in firstLabel) return String((firstLabel as Record<string, unknown>)['@value']);
        // Handle language map
        if (typeof firstLabel === 'object') {
          const lang = Object.keys(firstLabel as Record<string, unknown>)[0];
          if (lang) return String((firstLabel as Record<string, unknown>)[lang]);
        }
      }
    }
    // Handle direct language map
    const firstKey = Object.keys(labelObj)[0];
    if (firstKey) {
      const value = labelObj[firstKey];
      return Array.isArray(value) ? String(value[0]) : String(value);
    }
  }
  return 'Untitled';
}

/**
 * Convert v2 label to v3 format
 */
function convertLabelToV3(label: unknown): { [lang: string]: string[] } {
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
export function convertManifestV2toV3(v2Manifest: unknown): IIIFV3Manifest {
  const v2 = v2Manifest as Record<string, unknown>;
  const v3Manifest: IIIFV3Manifest = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: String(v2['@id'] || v2.id),
    type: 'Manifest',
    label: convertLabelToV3(v2.label),
  };

  // Convert description
  if (v2.description) {
    v3Manifest.summary = convertLabelToV3(v2.description);
  }

  // Convert metadata
  if (v2.metadata && Array.isArray(v2.metadata)) {
    v3Manifest.metadata = v2.metadata.map((item: unknown) => {
      const itemObj = item as Record<string, unknown>;
      return {
        label: convertLabelToV3(itemObj.label),
        value: convertLabelToV3(itemObj.value),
      };
    });
  }

  // Convert attribution to requiredStatement
  if (v2.attribution) {
    v3Manifest.requiredStatement = {
      label: { en: ['Attribution'], ja: ['帰属'] },
      value: convertLabelToV3(v2.attribution),
    };
  }

  // Convert license to rights
  if (v2.license) {
    v3Manifest.rights = typeof v2.license === 'string' ? v2.license : '';
  }

  // Convert sequences/canvases to items
  if (v2.sequences && Array.isArray(v2.sequences) && v2.sequences[0]) {
    const seq = v2.sequences[0] as Record<string, unknown>;
    if (seq.canvases && Array.isArray(seq.canvases)) {
      v3Manifest.items = seq.canvases.map((canvas: unknown, canvasIndex: number) => {
        const c = canvas as Record<string, unknown>;
        const canvasId = String(c['@id'] || `canvas-${canvasIndex}`);
      
        const v3Canvas: {
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
        } = {
          id: canvasId,
          type: 'Canvas',
          width: Number(c.width) || 1000,
          height: Number(c.height) || 1000,
          items: []
        };

        // Convert images to annotation pages
        if (c.images && Array.isArray(c.images) && c.images.length > 0) {
          v3Canvas.items = [{
            id: `${canvasId}/page`,
            type: 'AnnotationPage',
            items: c.images.map((image: unknown, imageIndex: number) => {
              const img = image as Record<string, unknown>;
              const resource = img.resource as Record<string, unknown>;
              return {
                id: `${canvasId}/annotation/${imageIndex}`,
                type: 'Annotation',
                motivation: 'painting',
                body: {
                  id: String(resource['@id'] || resource.id),
                  type: 'Image',
                  format: String(resource.format || 'image/jpeg'),
                  width: resource.width ? Number(resource.width) : undefined,
                  height: resource.height ? Number(resource.height) : undefined,
                },
                target: canvasId
              };
            })
          }];
        }

        return v3Canvas;
      });
    }
  }

  return v3Manifest;
}

/**
 * Check if manifest is v2 format
 */
export function isV2Manifest(manifest: unknown): boolean {
  const m = manifest as Record<string, unknown>;
  return !!(m['@id'] && m['@type'] && m.sequences);
}

/**
 * Check if manifest is v3 format
 */
export function isV3Manifest(manifest: unknown): boolean {
  const m = manifest as Record<string, unknown>;
  return !!(m.id && m.type && !m['@id'] && !m['@type']);
}

/**
 * Convert manifest to v3 if needed
 */
export function ensureV3Manifest(manifest: unknown): IIIFV3Manifest {
  if (isV2Manifest(manifest)) {
    return convertManifestV2toV3(manifest);
  }
  return manifest as IIIFV3Manifest;
}

/**
 * Extract common data from any version manifest
 */
export function extractManifestData(manifest: unknown) {
  const v3Manifest = ensureV3Manifest(manifest);
  
  const images: Array<{ url: string; width: number; height: number; mimeType: string }> = [];
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