import { NextRequest, NextResponse } from 'next/server';
import { verifyAuthToken } from '@/lib/iiif-auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { IIIFManifest } from '@/lib/iiif-manifest';

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
  params: Promise<{ id: string }>;
}

async function getManifestFromS3(manifestPath: string) {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: manifestPath,
    });
    
    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();
    
    if (!bodyString) return null;
    return JSON.parse(bodyString);
  } catch (error) {
    console.error('Error fetching manifest from S3:', error);
    return null;
  }
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    
    // Parse the item ID to extract components
    // Expected format: userId_collectionId_itemId or userId-collectionId-itemId
    const parts = id.includes('_') ? id.split('_') : id.split('-');
    if (parts.length !== 3) {
      return NextResponse.json({ error: 'Invalid manifest ID format' }, { status: 400 });
    }
    
    const [userId, collectionId, itemId] = parts;
    
    // Construct the S3 path
    const manifestPath = `collections/${userId}/${collectionId}/items/${itemId}/manifest.json`;
    
    // Get manifest from S3
    const manifest = await getManifestFromS3(manifestPath);
    
    if (!manifest) {
      return NextResponse.json({ error: 'Manifest not found' }, { status: 404 });
    }

    // Update manifest ID to match new URL structure
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    manifest.id = `${baseUrl}/api/iiif/3/${id}/manifest`;
    
    // Process manifest-level thumbnail
    if (manifest.thumbnail && manifest.thumbnail.length > 0) {
      manifest.thumbnail = manifest.thumbnail.map((thumb: { id: string; type: 'Image'; format: string; width?: number; height?: number }) => {
        if (thumb.id && process.env.S3_ENDPOINT && thumb.id.includes(process.env.S3_ENDPOINT)) {
          const thumbnailPath = thumb.id.replace(
            `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/`,
            ''
          );
          return {
            ...thumb,
            id: `${baseUrl}/api/iiif/image/${encodeURIComponent(thumbnailPath)}`
          };
        }
        return thumb;
      });
    }
    
    // Add georeferencing context if annotations exist
    if (manifest['x-geo-annotations']) {
      // Add georef context to @context if not already present
      if (manifest['@context']) {
        if (typeof manifest['@context'] === 'string') {
          manifest['@context'] = [
            "http://iiif.io/api/extension/georef/1/context.json",
            manifest['@context']
          ];
        } else if (Array.isArray(manifest['@context']) && !manifest['@context'].includes("http://iiif.io/api/extension/georef/1/context.json")) {
          manifest['@context'] = [
            "http://iiif.io/api/extension/georef/1/context.json",
            ...manifest['@context']
          ];
        }
      }
    }
    
    // Process manifest to update all S3 URLs to proxy URLs
    if (manifest.items) {
      manifest.items = manifest.items.map((canvas: IIIFManifest['items'][0] & { 'x-canvas-access'?: { isPublic?: boolean; allowedUsers?: string[]; allowedGroups?: string[] } }, index: number) => {
        // Check canvas-level access control
        const canvasAccess = canvas['x-canvas-access'];
        const isCanvasPublic = canvasAccess?.isPublic ?? true;
        
        // Use 1-based indexing for canvas IDs
        const canvasNumber = index + 1;
        
        // Update canvas ID
        if (canvas.id && process.env.S3_ENDPOINT && canvas.id.includes(process.env.S3_ENDPOINT)) {
          canvas.id = `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}`;
        }
        
        // Process canvas-level thumbnail
        if (canvas.thumbnail && canvas.thumbnail.length > 0) {
          canvas.thumbnail = canvas.thumbnail.map((thumb: { id: string; type: 'Image'; format: string; width?: number; height?: number }) => {
            if (thumb.id && process.env.S3_ENDPOINT && thumb.id.includes(process.env.S3_ENDPOINT)) {
              const thumbnailPath = thumb.id.replace(
                `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/`,
                ''
              );
              return {
                ...thumb,
                id: `${baseUrl}/api/iiif/image/${encodeURIComponent(thumbnailPath)}`
              };
            }
            return thumb;
          });
        }
        
        // Update annotation page and annotation IDs
        if (canvas.items?.[0]) {
          const annotationPage = canvas.items[0];
          if (annotationPage.id && process.env.S3_ENDPOINT && annotationPage.id.includes(process.env.S3_ENDPOINT)) {
            annotationPage.id = `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}/page`;
          }
          
          if (annotationPage.items?.[0]) {
            const annotation = annotationPage.items[0];
            if (annotation.id && process.env.S3_ENDPOINT && annotation.id.includes(process.env.S3_ENDPOINT)) {
              annotation.id = `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}/annotation`;
            }
            
            // Update target
            if (annotation.target && process.env.S3_ENDPOINT && annotation.target.includes(process.env.S3_ENDPOINT)) {
              annotation.target = `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}`;
            }
            
            // Update image body URL
            if (annotation.body?.id && process.env.S3_ENDPOINT && annotation.body.id.includes(process.env.S3_ENDPOINT)) {
              const imagePath = annotation.body.id.replace(
                `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/`,
                ''
              );
              const imageUrl = `${baseUrl}/api/iiif/image/${encodeURIComponent(imagePath)}`;
              annotation.body.id = `${imageUrl}?canvas=${canvasNumber}`;
              
              // Add IIIF Image Service for non-public canvases
              if (!isCanvasPublic && !annotation.body.service) {
                annotation.body.service = [
                  {
                    '@id': imageUrl,
                    '@type': 'ImageService2',
                    profile: 'http://iiif.io/api/image/2/level2.json'
                  }
                ];
              }
            }
          }
        }
        
        // Add georeferencing annotations if available
        if (manifest['x-geo-annotations'] && manifest['x-geo-annotations'][index]) {
          const geoAnnotation = manifest['x-geo-annotations'][index];
          if (geoAnnotation.points && geoAnnotation.points.length > 0) {
            canvas.annotations = [
              {
                id: `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}/annotationPage`,
                type: "AnnotationPage",
                items: [
                  {
                    id: `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}/annotation/georef`,
                    type: "Annotation",
                    motivation: "georeferencing",
                    target: canvas.id || `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}`,
                    body: {
                      id: `${baseUrl}/api/iiif/3/${id}/canvas/${canvasNumber}/feature-collection`,
                      type: "FeatureCollection",
                      transformation: {
                        type: geoAnnotation.transformationType || "polynomial",
                        options: {
                          order: geoAnnotation.transformationOrder || 1
                        }
                      },
                      features: geoAnnotation.points.map((point: {
                        id?: string;
                        resourceCoords: [number, number];
                        coordinates: [number, number];
                        label?: string;
                        tags?: string[];
                        url?: string;
                        xywh?: string;
                      }) => {
                        const feature: {
                          type: string;
                          id?: string;
                          properties: {
                            resourceCoords: [number, number];
                          };
                          geometry: {
                            type: string;
                            coordinates: [number, number];
                          };
                          metadata?: {
                            label?: string;
                            tags?: string[];
                            url?: string;
                            xywh?: string;
                            resourceCoords?: [number, number];
                          };
                        } = {
                          type: "Feature",
                          properties: {
                            resourceCoords: point.resourceCoords
                          },
                          geometry: {
                            type: "Point",
                            coordinates: point.coordinates
                          }
                        };
                        
                        // Add ID if present
                        if (point.id) {
                          feature.id = point.id;
                        }
                        
                        // Add metadata including resourceCoords
                        feature.metadata = {
                          resourceCoords: point.resourceCoords
                        };
                        if (point.label) feature.metadata.label = point.label;
                        if (point.tags) feature.metadata.tags = point.tags;
                        if (point.url) feature.metadata.url = point.url;
                        if (point.xywh) feature.metadata.xywh = point.xywh;
                        
                        return feature;
                      })
                    }
                  }
                ]
              }
            ];
          }
        }
        
        return canvas;
      });
    }
    
    // Check if item is public (from x-access metadata if available)
    const isPublic = manifest['x-access']?.isPublic ?? true;
    const owner = manifest['x-access']?.owner;
    
    // Remove internal access control fields before returning
    delete manifest['x-access'];
    delete manifest['x-geo-annotations'];
    if (manifest.items) {
      manifest.items.forEach((canvas: IIIFManifest['items'][0] & { 'x-canvas-access'?: { isPublic?: boolean; allowedUsers?: string[]; allowedGroups?: string[] } }) => {
        delete canvas['x-canvas-access'];
      });
    }
    
    // For Canvas-level auth, we always return the manifest structure
    // The auth happens at the image level
    // Only block the entire manifest if it's marked as non-public at the manifest level
    if (!isPublic) {
      // Check for auth token for manifest-level access
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
        // Return error response without manifest content
        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'This manifest requires authentication to access',
            authService: `${baseUrl}/api/iiif/auth/access/${id}`
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
    
    return NextResponse.json(manifest, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
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