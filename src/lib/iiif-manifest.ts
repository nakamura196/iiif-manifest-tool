import { uploadToS3, getS3Url } from './s3';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';
import { addItemToCollection, updateItemInCollection } from './iiif-collection';
import { v4 as uuidv4 } from 'uuid';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export interface IIIFManifest {
  '@context': string | string[];
  id: string;
  type: 'Manifest';
  label: { [key: string]: string[] };
  summary?: { [key: string]: string[] };
  navPlace?: {
    id?: string;
    type: 'FeatureCollection';
    features: Array<{
      id?: string;
      type: 'Feature';
      properties?: {
        label?: { [key: string]: string[] };
      };
      geometry: {
        type: 'Point';
        coordinates: [number, number]; // [longitude, latitude]
      };
    }>;
  };
  thumbnail?: Array<{
    id: string;
    type: 'Image';
    format: string;
    width?: number;
    height?: number;
  }>;
  items: Array<{
    id: string;
    type: 'Canvas';
    label: { [key: string]: string[] };
    height: number;
    width: number;
    thumbnail?: Array<{
      id: string;
      type: 'Image';
      format: string;
      width?: number;
      height?: number;
    }>;
    items: Array<{
      id: string;
      type: 'AnnotationPage';
      items: Array<{
        id: string;
        type: 'Annotation';
        motivation: 'painting';
        target: string;
        body: {
          id: string;
          type: 'Image';
          format: string;
          height: number;
          width: number;
          service?: Array<{
            '@id': string;
            '@type': string;
            profile: string;
          }>;
        };
      }>;
    }>;
    annotations?: Array<{  // Georeferencing annotations
      id: string;
      type: 'AnnotationPage';
      items: Array<{
        id: string;
        type: 'Annotation';
        motivation: string;
        target: string;
        body: {
          id: string;
          type: string;
          transformation?: {
            type: string;
            options?: {
              order?: number;
            };
          };
          features?: Array<{
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
            };
          }>;
        };
      }>;
    }>;
    'x-canvas-access'?: {  // Per-canvas access control (internal only)
      isPublic?: boolean;
      allowedUsers?: string[];
      allowedGroups?: string[];
    };
  }>;
  metadata?: Array<{
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  }>;
  attribution?: string;
  rights?: string;
  requiredStatement?: {
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  };
  homepage?: Array<{
    id: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  seeAlso?: Array<{
    id: string;
    type: string;
    format?: string;
    label?: { [key: string]: string[] };
  }>;
  provider?: Array<{
    id?: string;
    type: string;
    label?: { [key: string]: string[] };
  }>;
  'x-access'?: {  // Overall manifest access control (internal only)
    owner: string;
    collectionId: string;
    isPublic: boolean;
    canvasDefaults?: {  // Default settings for all canvases
      isPublic?: boolean;
    };
  };
  'x-geo-annotations'?: { [key: number]: {  // Georeferencing annotations (internal only)
    points: Array<{
      id?: string;
      resourceCoords: [number, number];
      coordinates: [number, number];
      label?: string;
      tags?: string[];
      url?: string;
      xywh?: string;
    }>;
    transformationType?: 'polynomial' | 'thin-plate-spline';
    transformationOrder?: number;
  }};
}

export async function createIIIFManifest(
  userId: string,
  collectionId: string,
  title: string,
  description: string | undefined,
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
    mimeType?: string;
    infoJson?: string;
    isIIIF?: boolean;
    iiifBaseUrl?: string;
    access?: {
      isPublic: boolean;
      allowedUsers: string[];
    };
  }>,
  isPublic: boolean = true,
  canvasAccess?: Array<{
    isPublic: boolean;
    allowedUsers: string[];
  }>,
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  }
): Promise<{ manifestId: string; manifestUrl: string }> {
  const itemId = uuidv4();
  const manifestKey = `collections/${userId}/${collectionId}/items/${itemId}/manifest.json`;
  
  // Always use S3 URL for storage
  const s3ManifestUrl = getS3Url(manifestKey);
  
  // Use versioned IIIF URL structure
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const manifestId = `${userId}_${collectionId}_${itemId}`;
  const publicManifestUrl = `${baseUrl}/api/iiif/3/${manifestId}/manifest`;

  const contexts: string[] = ['http://iiif.io/api/presentation/3/context.json'];
  if (location) {
    contexts.push('http://iiif.io/api/extension/navplace/context.json');
  }

  const manifest: IIIFManifest = {
    '@context': contexts.length === 1 ? contexts[0] : contexts,
    id: s3ManifestUrl,  // Store with S3 URL
    type: 'Manifest',
    label: {
      ja: [title],
      en: [title]
    },
    ...(location ? {
      navPlace: {
        type: 'FeatureCollection',
        features: [{
          type: 'Feature',
          properties: {
            label: {
              ja: [location.label || title],
              en: [location.label || title]
            }
          },
          geometry: {
            type: 'Point',
            coordinates: [location.longitude, location.latitude]
          }
        }]
      }
    } : {}),
    thumbnail: images[0] ? [
      {
        id: images[0].thumbnailUrl || images[0].url,
        type: 'Image' as const,
        format: images[0].mimeType || 'image/jpeg',
        width: images[0].thumbnailWidth || images[0].width,
        height: images[0].thumbnailHeight || images[0].height
      }
    ] : undefined,
    items: images.map((img, index) => {
      const canvasId = `${s3ManifestUrl}/canvas/${index}`;
      
      // Always store with original S3 URLs
      // Proxy conversion happens at API level when serving
      
      const canvas: IIIFManifest['items'][0] & { 'x-canvas-access'?: { isPublic?: boolean; allowedUsers?: string[]; allowedGroups?: string[] } } = {
        id: canvasId,
        type: 'Canvas' as const,
        label: { 
          ja: [`画像 ${index + 1}`], 
          en: [`Image ${index + 1}`] 
        },
        height: img.height,
        width: img.width,
        thumbnail: [
          {
            id: img.thumbnailUrl || img.url,
            type: 'Image' as const,
            format: img.mimeType || 'image/jpeg',
            width: img.thumbnailWidth || img.width,
            height: img.thumbnailHeight || img.height
          }
        ],
        items: [
          {
            id: `${canvasId}/page`,
            type: 'AnnotationPage' as const,
            items: [
              {
                id: `${canvasId}/annotation`,
                type: 'Annotation' as const,
                motivation: 'painting' as const,
                target: canvasId,
                body: {
                  id: img.url,  // Store with original URL
                  type: 'Image' as const,
                  format: img.mimeType || 'image/jpeg',
                  height: img.height,
                  width: img.width,
                  service: (img.isIIIF || img.infoJson || img.iiifBaseUrl || img.url.includes('iiif')) ? [
                    {
                      '@id': img.iiifBaseUrl || img.url.replace('/full/full/0/default.jpg', ''),
                      '@type': 'ImageService2',
                      profile: 'http://iiif.io/api/image/2/level2.json'
                    }
                  ] : undefined
                }
              }
            ]
          }
        ]
      };
      
      // Add per-canvas access control if provided
      if (canvasAccess && canvasAccess[index]) {
        canvas['x-canvas-access'] = canvasAccess[index];
      } else if (img.access) {
        canvas['x-canvas-access'] = img.access;
      }
      
      return canvas;
    }),
    metadata: [
      {
        label: { ja: ['作成日'], en: ['Created'] },
        value: { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
      },
      {
        label: { ja: ['コレクションID'], en: ['Collection ID'] },
        value: { ja: [collectionId], en: [collectionId] }
      }
    ],
    'x-access': {
      owner: userId,
      collectionId: collectionId,
      isPublic: isPublic
    }
  };

  if (description) {
    manifest.summary = {
      ja: [description],
      en: [description]
    };
  }

  // Upload manifest to S3
  await uploadToS3(
    manifestKey,
    JSON.stringify(manifest, null, 2),
    'application/json'
  );

  // Add item reference to collection (use public URL for collection reference)
  await addItemToCollection(userId, collectionId, publicManifestUrl, manifestId, title);

  return { manifestId: itemId, manifestUrl: publicManifestUrl };
}

export async function getIIIFManifest(
  userId: string,
  collectionId: string,
  manifestId: string
): Promise<IIIFManifest | null> {
  try {
    const manifestKey = `collections/${userId}/${collectionId}/items/${manifestId}/manifest.json`;
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: manifestKey,
    });

    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();
    
    if (!bodyString) return null;
    
    return JSON.parse(bodyString);
  } catch (error) {
    console.error('Error fetching manifest:', error);
    return null;
  }
}

export async function listCollectionItems(
  userId: string,
  collectionId: string
): Promise<Array<{
  id: string;
  title: string;
  description?: string;
  imageCount: number;
  createdAt: string;
  manifestUrl: string;
  thumbnail?: string;
  isPublic?: boolean;
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  };
}>> {
  try {
    const prefix = `collections/${userId}/${collectionId}/items/`;
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
      Delimiter: '/'
    });

    const response = await s3Client.send(command);
    const items = [];

    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (!prefix.Prefix) continue;
        
        const manifestId = prefix.Prefix.split('/')[4]; // Extract manifestId from path
        const manifest = await getIIIFManifest(userId, collectionId, manifestId);
        
        if (manifest) {
          const createdAt = manifest.metadata?.find(
            m => m.label.ja?.[0] === '作成日' || m.label.en?.[0] === 'Created'
          )?.value.ja?.[0] || new Date().toISOString();

          // Get thumbnail from manifest or first canvas thumbnail or first image
          let thumbnail: string | undefined;
          if (manifest.thumbnail && manifest.thumbnail.length > 0) {
            thumbnail = manifest.thumbnail[0].id;
          } else if (manifest.items[0]?.thumbnail && manifest.items[0].thumbnail.length > 0) {
            thumbnail = manifest.items[0].thumbnail[0].id;
          } else {
            thumbnail = manifest.items[0]?.items[0]?.items[0]?.body?.id;
          }
          const isPublic = manifest['x-access']?.isPublic ?? true;
          
          // Use new IIIF URL structure for manifest
          const combinedId = `${userId}_${collectionId}_${manifestId}`;
          const manifestUrl = `${process.env.NEXTAUTH_URL}/api/iiif/${combinedId}/manifest`;
          
          // Always use API proxy URL for thumbnail
          if (thumbnail && process.env.S3_ENDPOINT && thumbnail.includes(process.env.S3_ENDPOINT)) {
            const thumbPath = thumbnail.replace(
              `${process.env.S3_ENDPOINT}/${process.env.S3_BUCKET_NAME}/`,
              ''
            );
            thumbnail = `${process.env.NEXTAUTH_URL}/api/iiif/image/${encodeURIComponent(thumbPath)}`;
          }

          // Extract location from navPlace extension
          let location = undefined;
          if (manifest.navPlace && manifest.navPlace.features && manifest.navPlace.features.length > 0) {
            const feature = manifest.navPlace.features[0];
            if (feature.geometry && feature.geometry.type === 'Point') {
              location = {
                latitude: feature.geometry.coordinates[1],
                longitude: feature.geometry.coordinates[0],
                label: feature.properties?.label?.ja?.[0] || feature.properties?.label?.en?.[0] || ''
              };
            }
          }

          items.push({
            id: manifestId,
            title: manifest.label.ja?.[0] || manifest.label.en?.[0] || 'Untitled',
            description: manifest.summary?.ja?.[0] || manifest.summary?.en?.[0],
            imageCount: manifest.items.length,
            createdAt,
            manifestUrl,
            thumbnail,
            isPublic,
            location
          });
        }
      }
    }

    return items.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error listing collection items:', error);
    return [];
  }
}

export async function updateIIIFManifest(
  userId: string,
  collectionId: string,
  manifestId: string,
  title: string,
  description: string | undefined,
  images: Array<{
    url: string;
    thumbnailUrl?: string;
    width: number;
    height: number;
    thumbnailWidth?: number;
    thumbnailHeight?: number;
    mimeType?: string;
    infoJson?: string;
    isIIIF?: boolean;
    iiifBaseUrl?: string;
    access?: {
      isPublic: boolean;
      allowedUsers: string[];
    };
  }>,
  isPublic: boolean = true,
  canvasAccess?: Array<{
    isPublic: boolean;
    allowedUsers: string[];
  }>,
  location?: {
    latitude: number;
    longitude: number;
    label?: string;
  },
  metadata?: {
    attribution?: string;
    rights?: string;
    requiredStatement?: {
      label: { [key: string]: string[] };
      value: { [key: string]: string[] };
    };
    homepage?: Array<{
      id: string;
      type: string;
      label?: { [key: string]: string[] };
    }>;
    seeAlso?: Array<{
      id: string;
      type: string;
      format?: string;
      label?: { [key: string]: string[] };
    }>;
    provider?: Array<{
      id?: string;
      type: string;
      label?: { [key: string]: string[] };
    }>;
    customFields?: Array<{
      label: string;
      value: string;
    }>;
  },
  geoAnnotations?: { [key: number]: {
    points: Array<{
      id?: string;
      resourceCoords: [number, number];
      coordinates: [number, number];
      label?: string;
      tags?: string[];
      url?: string;
      xywh?: string;
    }>;
    transformationType?: 'polynomial' | 'thin-plate-spline';
    transformationOrder?: number;
  }}
): Promise<boolean> {
  try {
    const manifestKey = `collections/${userId}/${collectionId}/items/${manifestId}/manifest.json`;
    
    // Get existing manifest to preserve some metadata
    const existingManifest = await getIIIFManifest(userId, collectionId, manifestId);
    if (!existingManifest) {
      console.error('Manifest not found for update');
      return false;
    }
    
    // Always use S3 URL for storage
    const s3ManifestUrl = getS3Url(manifestKey);
    
    const contexts: string[] = ['http://iiif.io/api/presentation/3/context.json'];
    if (location) {
      contexts.push('http://iiif.io/api/extension/navplace/context.json');
    }
    
    const manifest: IIIFManifest = {
      '@context': contexts.length === 1 ? contexts[0] : contexts,
      id: s3ManifestUrl,
      type: 'Manifest',
      label: {
        ja: [title],
        en: [title]
      },
      ...(location ? {
        navPlace: {
          type: 'FeatureCollection',
          features: [{
            type: 'Feature',
            properties: {
              label: {
                ja: [location.label || title],
                en: [location.label || title]
              }
            },
            geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            }
          }]
        }
      } : {}),
      thumbnail: images[0] ? [
        {
          id: images[0].thumbnailUrl || images[0].url,
          type: 'Image' as const,
          format: images[0].mimeType || 'image/jpeg',
          width: images[0].thumbnailWidth || images[0].width,
          height: images[0].thumbnailHeight || images[0].height
        }
      ] : undefined,
      items: images.map((img, index) => {
        const canvasId = `${s3ManifestUrl}/canvas/${index}`;
        
        const canvas: IIIFManifest['items'][0] & { 'x-canvas-access'?: { isPublic?: boolean; allowedUsers?: string[]; allowedGroups?: string[] } } = {
          id: canvasId,
          type: 'Canvas' as const,
          label: { 
            ja: [`画像 ${index + 1}`], 
            en: [`Image ${index + 1}`] 
          },
          height: img.height,
          width: img.width,
          thumbnail: [
            {
              id: img.thumbnailUrl || img.url,
              type: 'Image' as const,
              format: img.mimeType || 'image/jpeg',
              width: img.thumbnailWidth || img.width,
              height: img.thumbnailHeight || img.height
            }
          ],
          items: [
            {
              id: `${canvasId}/page`,
              type: 'AnnotationPage' as const,
              items: [
                {
                  id: `${canvasId}/annotation`,
                  type: 'Annotation' as const,
                  motivation: 'painting' as const,
                  target: canvasId,
                  body: {
                    id: img.url,
                    type: 'Image' as const,
                    format: img.mimeType || 'image/jpeg',
                    height: img.height,
                    width: img.width,
                    service: (img.isIIIF || img.infoJson || img.iiifBaseUrl || img.url.includes('iiif')) ? [
                      {
                        '@id': img.iiifBaseUrl || img.url.replace('/full/full/0/default.jpg', ''),
                        '@type': 'ImageService2',
                        profile: 'http://iiif.io/api/image/2/level2.json'
                      }
                    ] : undefined
                  }
                }
              ]
            }
          ]
        };
        
        // Add per-canvas access control if provided
        if (canvasAccess && canvasAccess[index]) {
          canvas['x-canvas-access'] = canvasAccess[index];
        } else if (img.access) {
          canvas['x-canvas-access'] = img.access;
        }
        
        return canvas;
      }),
      metadata: [
        {
          label: { ja: ['作成日'], en: ['Created'] },
          value: existingManifest.metadata?.find(
            m => m.label.ja?.[0] === '作成日' || m.label.en?.[0] === 'Created'
          )?.value || { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
        },
        {
          label: { ja: ['更新日'], en: ['Updated'] },
          value: { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
        },
        {
          label: { ja: ['コレクションID'], en: ['Collection ID'] },
          value: { ja: [collectionId], en: [collectionId] }
        },
        // Add custom metadata fields
        ...(metadata?.customFields?.filter(field => field.label && field.value).map(field => ({
          label: { ja: [field.label] },
          value: { ja: [field.value] }
        })) || [])
      ],
      'x-access': {
        owner: userId,
        collectionId: collectionId,
        isPublic: isPublic
      }
    };

    if (description) {
      manifest.summary = {
        ja: [description],
        en: [description]
      };
    }

    // Add IIIF metadata fields
    if (metadata) {
      if (metadata.attribution) {
        (manifest as IIIFManifest).attribution = metadata.attribution;
      }
      if (metadata.rights) {
        (manifest as IIIFManifest).rights = metadata.rights;
      }
      if (metadata.requiredStatement) {
        (manifest as IIIFManifest).requiredStatement = metadata.requiredStatement;
      }
      if (metadata.homepage) {
        (manifest as IIIFManifest).homepage = metadata.homepage;
      }
      if (metadata.seeAlso) {
        (manifest as IIIFManifest).seeAlso = metadata.seeAlso;
      }
      if (metadata.provider) {
        (manifest as IIIFManifest).provider = metadata.provider;
      }
    }
    
    // Add location if provided
    if (location) {
      (manifest as unknown as Record<string, unknown>).navPlace = {
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [location.longitude, location.latitude]
            },
            properties: {
              label: {
                ja: [location.label || title],
                en: [location.label || title]
              }
            }
          }
        ]
      };
    }

    // Add georeferencing annotations if provided
    if (geoAnnotations && Object.keys(geoAnnotations).length > 0) {
      (manifest as unknown as Record<string, unknown>)['x-geo-annotations'] = geoAnnotations;
    }

    // Upload updated manifest to S3
    await uploadToS3(
      manifestKey,
      JSON.stringify(manifest, null, 2),
      'application/json'
    );

    // Update the title in the collection if it has changed
    const oldTitle = existingManifest.label.ja?.[0] || existingManifest.label.en?.[0];
    if (oldTitle !== title) {
      await updateItemInCollection(userId, collectionId, manifestId, title);
    }

    return true;
  } catch (error) {
    console.error('Error updating manifest:', error);
    return false;
  }
}

export async function deleteIIIFManifest(
  userId: string,
  collectionId: string,
  manifestId: string
): Promise<boolean> {
  try {
    // Delete manifest and all related files from S3
    const { DeleteObjectsCommand } = await import('@aws-sdk/client-s3');
    const prefix = `collections/${userId}/${collectionId}/items/${manifestId}/`;
    
    // List all objects with this prefix
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    if (listResponse.Contents && listResponse.Contents.length > 0) {
      // Delete all objects
      const deleteCommand = new DeleteObjectsCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Delete: {
          Objects: listResponse.Contents.map(obj => ({ Key: obj.Key }))
        }
      });
      
      await s3Client.send(deleteCommand);
    }
    
    // Also remove from collection
    const { removeItemFromCollection } = await import('./iiif-collection');
    await removeItemFromCollection(userId, collectionId, manifestId);
    
    return true;
  } catch (error) {
    console.error('Error deleting manifest:', error);
    return false;
  }
}