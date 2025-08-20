import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

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
  params: Promise<{ path: string[] }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { path } = await params;
    let imagePath = path.join('/');
    
    // Check if this is an info.json request
    const isInfoJsonRequest = imagePath.endsWith('/info.json');
    if (isInfoJsonRequest) {
      imagePath = imagePath.replace('/info.json', '');
    }
    
    const decodedPath = decodeURIComponent(imagePath);
    
    console.log('[Image Proxy] Request for path:', decodedPath);
    
    // Get canvas index from query parameter if provided
    const url = new URL(request.url);
    const canvasIndex = url.searchParams.get('canvas');
    
    // Determine if this image requires authentication
    // We need to check if this image belongs to a private manifest
    
    // For images in collections, check the manifest's access settings
    if (decodedPath.startsWith('collections/')) {
      const pathParts = decodedPath.split('/');
      if (pathParts.length >= 5) {
        const userId = pathParts[1];
        const collectionId = pathParts[2];
        const itemId = pathParts[4];
        
        console.log('[Image Proxy] Checking access for:', { userId, collectionId, itemId, canvasIndex });
        
        // Try to get the manifest to check access settings
        try {
          const { getIIIFManifest } = await import('@/lib/iiif-manifest');
          const manifest = await getIIIFManifest(userId, collectionId, itemId);
          
          if (manifest) {
            // First check manifest-level access
            const manifestIsPublic = manifest['x-access']?.isPublic ?? true;
            console.log('[Image Proxy] Manifest isPublic:', manifestIsPublic);
            
            // Find which canvas this image belongs to by matching the image URL
            let targetCanvasIndex = canvasIndex ? parseInt(canvasIndex) : null;
            
            // If no canvas index provided, try to find it by matching the image URL
            if (targetCanvasIndex === null) {
              const fullImagePath = `${process.env.MDX_S3_ENDPOINT}/${process.env.MDX_S3_BUCKET_NAME}/${decodedPath}`;
              for (let i = 0; i < manifest.items.length; i++) {
                const canvas = manifest.items[i];
                const imageUrl = canvas.items?.[0]?.items?.[0]?.body?.id;
                if (imageUrl === fullImagePath || imageUrl?.includes(decodedPath)) {
                  targetCanvasIndex = i;
                  console.log('[Image Proxy] Found image at canvas index:', i);
                  break;
                }
              }
            }
            
            // Check access control
            let requiresAuth = !manifestIsPublic;
            
            if (targetCanvasIndex !== null && manifest.items[targetCanvasIndex]) {
              const canvas = manifest.items[targetCanvasIndex];
              if (canvas['x-canvas-access']) {
                // Canvas has specific access control
                const canvasIsPublic = canvas['x-canvas-access'].isPublic ?? manifestIsPublic;
                requiresAuth = !canvasIsPublic;
                console.log('[Image Proxy] Canvas', targetCanvasIndex, 'isPublic:', canvasIsPublic, 'requiresAuth:', requiresAuth);
                
                if (requiresAuth) {
                  const session = await getServerSession(authOptions);
                  console.log('[Image Proxy] Session user:', session?.user?.email);
                  
                  if (!session?.user?.id) {
                    console.log('[Image Proxy] No authenticated user, returning 401');
                    return NextResponse.json(
                      { error: 'Authentication required' },
                      { status: 401 }
                    );
                  }
                  
                  // Check if user is in allowed users list
                  const allowedUsers = canvas['x-canvas-access'].allowedUsers || [];
                  const isOwner = manifest['x-access']?.owner === session.user.id;
                  const isAllowed = isOwner || allowedUsers.includes(session.user.email || session.user.id);
                  
                  console.log('[Image Proxy] Access check:', { isOwner, allowedUsers, userEmail: session.user.email, isAllowed });
                  
                  if (!isAllowed) {
                    console.log('[Image Proxy] Access denied, returning 403');
                    return NextResponse.json(
                      { error: 'Access denied to this image' },
                      { status: 403 }
                    );
                  }
                }
              } else if (requiresAuth) {
                // Use manifest-level access control
                const session = await getServerSession(authOptions);
                console.log('[Image Proxy] Using manifest-level auth, session:', session?.user?.email);
                
                if (!session?.user?.id) {
                  console.log('[Image Proxy] No authenticated user for private manifest, returning 401');
                  return NextResponse.json(
                    { error: 'Authentication required' },
                    { status: 401 }
                  );
                }
                
                const isOwner = manifest['x-access']?.owner === session.user.id;
                
                if (!isOwner) {
                  console.log('[Image Proxy] Not owner of private manifest, returning 403');
                  return NextResponse.json(
                    { error: 'Access denied' },
                    { status: 403 }
                  );
                }
              }
            } else if (requiresAuth) {
              // Manifest is private but we couldn't find the specific canvas
              const session = await getServerSession(authOptions);
              
              if (!session?.user?.id) {
                console.log('[Image Proxy] No authenticated user for private manifest (no canvas), returning 401');
                return NextResponse.json(
                  { error: 'Authentication required' },
                  { status: 401 }
                );
              }
              
              const isOwner = manifest['x-access']?.owner === session.user.id;
              
              if (!isOwner) {
                console.log('[Image Proxy] Not owner of private manifest (no canvas), returning 403');
                return NextResponse.json(
                  { error: 'Access denied' },
                  { status: 403 }
                );
              }
            }
          }
        } catch (error) {
          console.error('[Image Proxy] Error checking manifest access:', error);
          // If we can't check, deny access for safety
          return NextResponse.json(
            { error: 'Failed to verify access permissions' },
            { status: 500 }
          );
        }
      }
    }
    
    // For standalone images (not in collections), we could check a separate access control
    // For now, we'll allow access to all standalone images
    
    // If this is an info.json request, return the IIIF Image Information
    if (isInfoJsonRequest) {
      const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
      const imageUrl = `${baseUrl}/api/iiif/image/${encodeURIComponent(decodedPath)}`;
      
      // Try to get image dimensions from manifest if available
      let width = 1000;
      let height = 1000;
      
      if (decodedPath.startsWith('collections/')) {
        const pathParts = decodedPath.split('/');
        if (pathParts.length >= 5) {
          const userId = pathParts[1];
          const collectionId = pathParts[2];
          const itemId = pathParts[4];
          
          try {
            const { getIIIFManifest } = await import('@/lib/iiif-manifest');
            const manifest = await getIIIFManifest(userId, collectionId, itemId);
            
            if (manifest && manifest.items?.[0]) {
              width = manifest.items[0].width || width;
              height = manifest.items[0].height || height;
            }
          } catch (error) {
            console.error('[Image Proxy] Error getting manifest for dimensions:', error);
          }
        }
      }
      
      const infoJson = {
        '@context': 'http://iiif.io/api/image/2/context.json',
        '@id': imageUrl,
        'protocol': 'http://iiif.io/api/image',
        'width': width,
        'height': height,
        'profile': [
          'http://iiif.io/api/image/2/level2.json',
          {
            'formats': ['jpg', 'png', 'webp'],
            'qualities': ['default', 'color', 'gray'],
            'supports': ['regionByPct', 'sizeByForcedWh', 'sizeByWh', 'sizeAboveFull', 'rotationBy90s', 'mirroring']
          }
        ]
      };
      
      return NextResponse.json(infoJson, {
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        }
      });
    }

    // Fetch the image from S3
    const command = new GetObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
      Key: decodedPath,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return NextResponse.json({ error: 'Image not found' }, { status: 404 });
    }

    // Convert the stream to a buffer
    const chunks = [];
    const stream = response.Body as AsyncIterable<Uint8Array>;
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return the image with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'image/jpeg',
        'Content-Length': response.ContentLength?.toString() || buffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error fetching image:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image' },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}