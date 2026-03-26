import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/iiif-auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getAuthUser } from '@/lib/auth-helpers';
import { IIIFManifest } from '@/lib/iiif-manifest';
import { buildManifestUrl } from '@/lib/iiif-ids';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

interface RouteParams {
  params: Promise<{ userId: string; collectionId: string; itemId: string }>;
}

type IIIFV2Label = string | Array<{ "@language": string; "@value": string }>;

interface IIIFV2Manifest {
  "@context": string;
  "@id": string;
  "@type": string;
  label: IIIFV2Label;
  thumbnail?: string | {
    "@id": string;
    "@type": string;
    format?: string;
    height?: number;
    width?: number;
  };
  sequences: Array<{
    "@id": string;
    "@type": string;
    label: string;
    canvases: Array<{
      "@id": string;
      "@type": string;
      label: IIIFV2Label;
      height: number;
      width: number;
      thumbnail?: {
        "@id": string;
        "@type": string;
        format?: string;
        height?: number;
        width?: number;
      };
      images: Array<{
        "@id": string;
        "@type": string;
        motivation: string;
        resource: {
          "@id": string;
          "@type": string;
          format: string;
          height?: number;
          width?: number;
          service?: {
            "@context": string;
            "@id": string;
            profile: string;
          };
        };
        on: string;
      }>;
    }>;
  }>;
  metadata?: Array<{
    label: IIIFV2Label;
    value: IIIFV2Label;
  }>;
  attribution?: string;
  license?: string;
  description?: string;
}

// Convert IIIF v3 to v2 format
function convertToV2Manifest(v3Manifest: IIIFManifest): IIIFV2Manifest {
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  const makeAbsoluteUrl = (url: string): string => {
    if (!url) return url;
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    const cleanUrl = url.startsWith('/') ? url : '/' + url;
    return `${baseUrl}${cleanUrl}`;
  };

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

  // Replace v3 path with v2 path in the manifest ID
  const v2ManifestId = makeAbsoluteUrl(v3Manifest.id.replace('/api/iiif/3/', '/api/iiif/2/'));

  const v2Manifest: IIIFV2Manifest = {
    "@context": "http://iiif.io/api/presentation/2/context.json",
    "@id": v2ManifestId,
    "@type": "sc:Manifest",
    "label": convertLabel(v3Manifest.label),
    "sequences": [
      {
        "@id": `${v2ManifestId}/sequence/normal`,
        "@type": "sc:Sequence",
        "label": "Current Page Order",
        "canvases": []
      }
    ]
  };

  if (v3Manifest.metadata) {
    v2Manifest.metadata = v3Manifest.metadata.map(item => ({
      label: convertLabel(item.label),
      value: convertLabel(item.value)
    }));
  }

  if (v3Manifest.attribution) {
    v2Manifest.attribution = v3Manifest.attribution;
  }

  if (v3Manifest.rights) {
    v2Manifest.license = v3Manifest.rights;
  }

  if (v3Manifest.summary) {
    const summary = v3Manifest.summary;
    if (typeof summary === 'object' && 'ja' in summary) {
      const localizedSummary = summary as { [key: string]: string[] };
      v2Manifest.description = localizedSummary.ja?.[0] || localizedSummary.en?.[0] || '';
    } else if (typeof summary === 'string') {
      v2Manifest.description = summary;
    }
  }

  if (v3Manifest.thumbnail && v3Manifest.thumbnail.length > 0) {
    const thumb = v3Manifest.thumbnail[0];
    v2Manifest.thumbnail = {
      "@id": makeAbsoluteUrl(thumb.id),
      "@type": "dctypes:Image",
      "format": thumb.format || "image/jpeg",
      "height": thumb.height,
      "width": thumb.width
    };
  }

  if (v3Manifest.items && v3Manifest.items.length > 0) {
    v2Manifest.sequences[0].canvases = v3Manifest.items.map((canvas) => {
      const v2CanvasId = makeAbsoluteUrl(canvas.id.replace('/api/iiif/3/', '/api/iiif/2/'));
      const v2Canvas: IIIFV2Manifest['sequences'][0]['canvases'][0] = {
        "@id": v2CanvasId,
        "@type": "sc:Canvas",
        "label": convertLabel(canvas.label),
        "height": canvas.height,
        "width": canvas.width,
        "images": []
      };

      if (canvas.thumbnail && canvas.thumbnail.length > 0) {
        const thumb = canvas.thumbnail[0];
        v2Canvas.thumbnail = {
          "@id": makeAbsoluteUrl(thumb.id),
          "@type": "dctypes:Image",
          "format": thumb.format || "image/jpeg",
          "height": thumb.height,
          "width": thumb.width
        };
      }

      if (canvas.items?.[0]?.items?.[0]) {
        const annotation = canvas.items[0].items[0];
        if (annotation.body) {
          const image = {
            "@id": `${v2CanvasId}/annotation/painting`,
            "@type": "oa:Annotation",
            "motivation": "sc:painting",
            "resource": {
              "@id": makeAbsoluteUrl(annotation.body.id),
              "@type": "dctypes:Image",
              "format": annotation.body.format || "image/jpeg",
              "height": annotation.body.height,
              "width": annotation.body.width
            },
            "on": v2CanvasId
          };

          const bodyWithService = annotation.body as { service?: unknown };
          if (bodyWithService.service) {
            const serviceArray = Array.isArray(bodyWithService.service)
              ? bodyWithService.service
              : [bodyWithService.service];
            const service = serviceArray[0] as { '@id'?: string; id?: string } | undefined;

            const resourceWithService = image.resource as { service?: unknown };
            resourceWithService.service = {
              "@context": "http://iiif.io/api/image/2/context.json",
              "@id": makeAbsoluteUrl(service?.['@id'] || service?.id || annotation.body.id.split('?')[0]),
              "profile": "http://iiif.io/api/image/2/level2.json"
            };
          }

          const canvasImages = v2Canvas.images as unknown[];
          canvasImages.push(image);
        }
      }

      return v2Canvas;
    });
  }

  return v2Manifest;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId, collectionId, itemId } = await params;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

    // Construct the S3 path to check access control
    const manifestPath = `collections/${userId}/${collectionId}/items/${itemId}/manifest.json`;

    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: manifestPath,
    });

    let rawManifest;
    try {
      const response = await s3Client.send(command);
      const bodyString = await response.Body?.transformToString();
      if (!bodyString) {
        return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
      }
      rawManifest = JSON.parse(bodyString);
    } catch {
      return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
    }

    // Check if item is public
    const isPublic = rawManifest['x-access']?.isPublic ?? true;
    const owner = rawManifest['x-access']?.owner;

    if (!isPublic) {
      const authHeader = request.headers.get('authorization');
      const session = await getAuthUser(request);

      let hasAccess = false;

      if (session?.id && owner === session.id) {
        hasAccess = true;
      }

      if (!hasAccess && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyAuthToken(token);

        if (decoded && decoded.userId === owner) {
          hasAccess = true;
        }
      }

      if (!hasAccess) {
        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'This manifest requires authentication to access'
          },
          {
            status: 401,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
              'Access-Control-Allow-Methods': 'GET, OPTIONS',
              'Access-Control-Allow-Headers': 'Content-Type, Authorization',
            },
          }
        );
      }
    }

    // Fetch the processed v3 manifest from the new RESTful endpoint
    const v3Url = buildManifestUrl(baseUrl, userId, collectionId, itemId, 3);
    const v3Response = await fetch(v3Url, {
      headers: {
        'Accept': 'application/ld+json',
      },
    });

    if (!v3Response.ok) {
      return NextResponse.json({ error: 'Failed to fetch v3 manifest' }, { status: 500 });
    }

    const v3Manifest = await v3Response.json();

    // Convert to v2 format
    const v2Manifest = convertToV2Manifest(v3Manifest);

    return NextResponse.json(v2Manifest, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/2/context.json"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('Error fetching manifest:', error);
    return NextResponse.json(
      { error: 'Failed to fetch manifest' },
      { status: 500 }
    );
  }
}
