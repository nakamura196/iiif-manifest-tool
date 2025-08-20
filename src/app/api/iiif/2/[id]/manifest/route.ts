import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/iiif-auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IIIFManifest } from '@/lib/iiif-manifest';

const s3Client = new S3Client({
  endpoint: process.env.MDX_S3_ENDPOINT,
  region: process.env.MDX_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MDX_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MDX_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

interface RouteParams {
  params: Promise<{ id: string }>;
}

interface IIIFV2Manifest {
  "@context": string;
  "@id": string;
  "@type": string;
  label: string | { [key: string]: string[] };
  sequences: Array<{
    "@id": string;
    "@type": string;
    label: string;
    canvases: Array<{
      "@id": string;
      "@type": string;
      label: string | { [key: string]: string[] };
      height: number;
      width: number;
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
    label: string | { [key: string]: string[] };
    value: string | { [key: string]: string[] };
  }>;
  attribution?: string;
  license?: string;
  description?: string;
}

// Convert IIIF v3 to v2 format
function convertToV2Manifest(v3Manifest: IIIFManifest): IIIFV2Manifest {
  
  const v2Manifest: IIIFV2Manifest = {
    "@context": "http://iiif.io/api/presentation/2/context.json",
    "@id": v3Manifest.id.replace('/api/iiif/3/', '/api/iiif/2/'),
    "@type": "sc:Manifest",
    "label": v3Manifest.label,
    "sequences": [
      {
        "@id": `${v3Manifest.id.replace('/api/iiif/3/', '/api/iiif/2/')}/sequence/normal`,
        "@type": "sc:Sequence",
        "label": "Current Page Order",
        "canvases": []
      }
    ]
  };

  // Add metadata if present
  if (v3Manifest.metadata) {
    v2Manifest.metadata = v3Manifest.metadata;
  }

  // Add attribution if present
  if (v3Manifest.attribution) {
    v2Manifest.attribution = v3Manifest.attribution;
  }

  // Add rights if present
  if (v3Manifest.rights) {
    v2Manifest.license = v3Manifest.rights;
  }

  // Add description if present
  if (v3Manifest.summary) {
    const summary = v3Manifest.summary;
    if (typeof summary === 'object' && 'ja' in summary) {
      const localizedSummary = summary as { [key: string]: string[] };
      v2Manifest.description = localizedSummary.ja?.[0] || localizedSummary.en?.[0] || '';
    } else if (typeof summary === 'string') {
      v2Manifest.description = summary;
    }
  }

  // Convert canvases
  if (v3Manifest.items && v3Manifest.items.length > 0) {
    v2Manifest.sequences[0].canvases = v3Manifest.items.map((canvas) => {
      const v2Canvas = {
        "@id": canvas.id.replace('/api/iiif/3/', '/api/iiif/2/'),
        "@type": "sc:Canvas",
        "label": canvas.label,
        "height": canvas.height,
        "width": canvas.width,
        "images": []
      };

      // Convert painting annotations to images
      if (canvas.items?.[0]?.items?.[0]) {
        const annotation = canvas.items[0].items[0];
        if (annotation.body) {
          const image = {
            "@id": `${v2Canvas["@id"]}/annotation/painting`,
            "@type": "oa:Annotation",
            "motivation": "sc:painting",
            "resource": {
              "@id": annotation.body.id,
              "@type": "dctypes:Image",
              "format": annotation.body.format || "image/jpeg",
              "height": annotation.body.height,
              "width": annotation.body.width
            },
            "on": v2Canvas["@id"]
          };

          // Add image service if present
          if ((annotation.body as any).service) {
            const service = Array.isArray((annotation.body as any).service) 
              ? (annotation.body as any).service[0] 
              : (annotation.body as any).service;
            
            (image.resource as any).service = {
              "@context": "http://iiif.io/api/image/2/context.json",
              "@id": service['@id'] || (service as any).id || annotation.body.id.split('?')[0],
              "profile": "http://iiif.io/api/image/2/level2.json"
            };
          }

          (v2Canvas.images as any[]).push(image);
        }
      }

      return v2Canvas;
    });
  }

  return v2Manifest;
}

async function getV3Manifest(id: string): Promise<IIIFManifest | null> {
  try {
    // Call the v3 manifest endpoint to get the processed manifest
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const response = await fetch(`${baseUrl}/api/iiif/3/${id}/manifest`, {
      headers: {
        'Accept': 'application/ld+json',
      },
    });
    
    if (!response.ok) {
      return null;
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error fetching v3 manifest:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // First check authentication using the same logic as v3
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid manifest ID format' }, { status: 400 });
    }
    
    const [userId, collectionId, itemId] = parts;
    
    // Construct the S3 path to check access control
    const manifestPath = `collections/${userId}/${collectionId}/items/${itemId}/manifest.json`;
    
    // Get manifest from S3 to check access control
    const command = new GetObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
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
    
    // For non-public manifests, check authentication
    if (!isPublic) {
      const authHeader = request.headers.get('authorization');
      const session = await getServerSession(authOptions);
      
      let hasAccess = false;
      
      // Check if user is authenticated and is the owner
      if (session?.user?.id && owner === session.user.id) {
        hasAccess = true;
      }
      
      // Check for valid auth token
      if (!hasAccess && authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        const decoded = verifyAuthToken(token);
        
        if (decoded && decoded.itemId === id && decoded.userId === owner) {
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

    // Now get the processed v3 manifest (with proper URLs)
    const authHeaders: HeadersInit = {};
    if (request.headers.get('authorization')) {
      authHeaders['Authorization'] = request.headers.get('authorization')!;
    }
    
    const v3Manifest = await getV3Manifest(id);
    if (!v3Manifest) {
      return NextResponse.json({ error: 'Failed to fetch v3 manifest' }, { status: 500 });
    }

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