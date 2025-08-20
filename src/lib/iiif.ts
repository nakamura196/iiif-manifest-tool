export interface IIIFManifest {
  '@context': string | string[];
  id: string;
  type: string;
  label: { [key: string]: string[] };
  metadata?: Array<{
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  }>;
  summary?: { [key: string]: string[] };
  thumbnail?: Array<{
    id: string;
    type: string;
    format: string;
    width?: number;
    height?: number;
  }>;
  items: IIIFCanvas[];
  rights?: string;
  requiredStatement?: {
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  };
}

export interface IIIFCanvas {
  id: string;
  type: string;
  label: { [key: string]: string[] };
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
        format: string;
        width: number;
        height: number;
        service?: Array<{
          id: string;
          type: string;
          profile: string;
        }>;
      };
      target: string;
    }>;
  }>;
  annotations?: Array<{
    id: string;
    type: string;
    items: Array<{
      id: string;
      type: string;
      motivation: string;
      body: {
        type: string;
        value: string;
        format?: string;
        language?: string;
      };
      target: string;
    }>;
  }>;
}

export function createManifest(
  id: string,
  title: string,
  description: string | null,
  images: Array<{
    id: string;
    url: string;
    width: number;
    height: number;
    mimeType: string;
    infoJson?: string;
  }>
): IIIFManifest {
  const manifest: IIIFManifest = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: id,
    type: 'Manifest',
    label: {
      en: [title],
      ja: [title],
    },
    items: [],
  };

  if (description) {
    manifest.summary = {
      en: [description],
      ja: [description],
    };
  }

  // Add thumbnail if there are images
  if (images.length > 0) {
    const firstImage = images[0];
    manifest.thumbnail = [
      {
        id: firstImage.url,
        type: 'Image',
        format: firstImage.mimeType,
        width: Math.min(firstImage.width, 200),
        height: Math.min(firstImage.height, 200),
      },
    ];
  }

  // Create canvases for each image
  images.forEach((image, index) => {
    const canvasId = `${id}/canvas/${index + 1}`;
    const annotationPageId = `${canvasId}/page`;
    const annotationId = `${annotationPageId}/annotation`;
    
    const canvas: IIIFCanvas = {
      id: canvasId,
      type: 'Canvas',
      label: {
        en: [`Page ${index + 1}`],
        ja: [`ページ ${index + 1}`],
      },
      width: image.width,
      height: image.height,
      items: [
        {
          id: annotationPageId,
          type: 'AnnotationPage',
          items: [
            {
              id: annotationId,
              type: 'Annotation',
              motivation: 'painting',
              body: {
                id: image.url,
                type: 'Image',
                format: image.mimeType,
                width: image.width,
                height: image.height,
              },
              target: canvasId,
            },
          ],
        },
      ],
    };

    // Add IIIF Image API service if info.json is available
    if (image.infoJson) {
      try {
        const info = JSON.parse(image.infoJson);
        canvas.items[0].items[0].body.service = [
          {
            id: info.id || info['@id'],
            type: 'ImageService3',
            profile: 'level2',
          },
        ];
      } catch (e) {
        console.error('Failed to parse info.json:', e);
      }
    }

    manifest.items.push(canvas);
  });

  return manifest;
}

export function addAnnotationToCanvas(
  canvas: IIIFCanvas,
  annotation: {
    id: string;
    body: string;
    target: string;
    motivation: string;
  }
) {
  if (!canvas.annotations) {
    canvas.annotations = [];
  }

  const annotationPage = canvas.annotations.find(
    (page) => page.type === 'AnnotationPage'
  );

  const newAnnotation = {
    id: annotation.id,
    type: 'Annotation',
    motivation: annotation.motivation,
    body: {
      type: 'TextualBody',
      value: annotation.body,
      format: 'text/plain',
    },
    target: annotation.target,
  };

  if (annotationPage) {
    annotationPage.items.push(newAnnotation);
  } else {
    canvas.annotations.push({
      id: `${canvas.id}/annotations`,
      type: 'AnnotationPage',
      items: [newAnnotation],
    });
  }
}