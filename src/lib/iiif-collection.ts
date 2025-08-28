import { uploadToS3, getS3Url } from './s3';
import { S3Client, GetObjectCommand, ListObjectsV2Command } from '@aws-sdk/client-s3';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export interface IIIFCollection {
  '@context': string | string[];
  id: string;
  type: 'Collection';
  label: { [key: string]: string[] };
  summary?: { [key: string]: string[] };
  items: Array<{
    id: string;
    type: 'Manifest';
    label: { [key: string]: string[] };
    summary?: { [key: string]: string[] };
    thumbnail?: Array<{
      id: string;
      type: string;
      format: string;
      width: number;
      height: number;
    }>;
    manifestId?: string; // Custom property for internal tracking
  }>;
  metadata?: Array<{
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  }>;
  requiredStatement?: {
    label: { [key: string]: string[] };
    value: { [key: string]: string[] };
  };
  service?: Array<{
    '@id': string;
    '@type': string;
    profile: string;
    label?: string;
    description?: string;
  }>;
  // Custom extension for access control
  'x-access'?: {
    owner: string;
    isPublic: boolean;
    allowedUsers?: string[];
    allowedGroups?: string[];
  };
}

export async function createIIIFCollection(
  userId: string,
  collectionId: string,
  name: string | { ja?: string; en?: string },
  description?: string | { ja?: string; en?: string },
  isPublic: boolean = true
): Promise<string> {
  const collectionKey = `collections/${userId}/${collectionId}/collection.json`;
  const collectionUrl = getS3Url(collectionKey);

  // Handle multilingual names
  const nameJa = typeof name === 'string' ? name : (name.ja || name.en || 'Collection');
  const nameEn = typeof name === 'string' ? name : (name.en || name.ja || 'Collection');
  
  // Handle multilingual descriptions  
  const descriptionJa = typeof description === 'string' ? description : (description?.ja || description?.en || '');
  const descriptionEn = typeof description === 'string' ? description : (description?.en || description?.ja || '');

  const collection: IIIFCollection = {
    '@context': 'http://iiif.io/api/presentation/3/context.json',
    id: collectionUrl,
    type: 'Collection',
    label: {
      ja: [nameJa],
      en: [nameEn]
    },
    ...(descriptionJa || descriptionEn ? {
      summary: {
        ...(descriptionJa ? { ja: [descriptionJa] } : {}),
        ...(descriptionEn ? { en: [descriptionEn] } : {})
      }
    } : {}),
    items: [],
    metadata: [
      {
        label: { ja: ['作成日'], en: ['Created'] },
        value: { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
      },
      {
        label: { ja: ['公開設定'], en: ['Visibility'] },
        value: { ja: [isPublic ? '公開' : '非公開'], en: [isPublic ? 'Public' : 'Private'] }
      }
    ],
    'x-access': {
      owner: userId,
      isPublic: isPublic,
      allowedUsers: [],
      allowedGroups: []
    }
  };

  // Add IIIF Auth service if not public
  if (!isPublic) {
    collection.service = [
      {
        '@id': `${process.env.NEXTAUTH_URL}/api/auth/iiif/access/${collectionId}`,
        '@type': 'AuthCookieService1',
        profile: 'http://iiif.io/api/auth/1/login',
        label: 'Login Required',
        description: 'This collection requires authentication'
      }
    ];
  }

  if (description) {
    collection.summary = {
      ja: [description],
      en: [description]
    };
  }

  await uploadToS3(
    collectionKey,
    JSON.stringify(collection, null, 2),
    'application/json'
  );

  return collectionUrl;
}

export async function getIIIFCollection(userId: string, collectionId: string): Promise<IIIFCollection | null> {
  try {
    const collectionKey = `collections/${userId}/${collectionId}/collection.json`;
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: collectionKey,
    });

    const response = await s3Client.send(command);
    const bodyString = await response.Body?.transformToString();
    
    if (!bodyString) return null;
    
    return JSON.parse(bodyString);
  } catch (error) {
    console.error('Error fetching collection:', error);
    return null;
  }
}

export async function updateIIIFCollection(
  userId: string,
  collectionId: string,
  updates: Partial<Pick<IIIFCollection, 'label' | 'summary' | 'items'>> & {
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
      homepage?: Array<{
        id: string;
        type: string;
        label?: { [key: string]: string[] };
      }>;
    }>;
  }
): Promise<boolean> {
  try {
    const existing = await getIIIFCollection(userId, collectionId);
    if (!existing) return false;

    const updated = {
      ...existing,
      ...updates,
      metadata: existing.metadata?.map(item => {
        if (item.label.ja?.[0] === '更新日' || item.label.en?.[0] === 'Updated') {
          return {
            label: { ja: ['更新日'], en: ['Updated'] },
            value: { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
          };
        }
        return item;
      })
    };

    // Ensure we have an updated date in metadata
    if (!updated.metadata?.some(item => item.label.ja?.[0] === '更新日' || item.label.en?.[0] === 'Updated')) {
      updated.metadata = [
        ...(updated.metadata || []),
        {
          label: { ja: ['更新日'], en: ['Updated'] },
          value: { ja: [new Date().toISOString()], en: [new Date().toISOString()] }
        }
      ];
    }

    const collectionKey = `collections/${userId}/${collectionId}/collection.json`;
    await uploadToS3(
      collectionKey,
      JSON.stringify(updated, null, 2),
      'application/json'
    );

    return true;
  } catch (error) {
    console.error('Error updating collection:', error);
    return false;
  }
}

export async function listUserCollections(userId: string): Promise<Array<{
  id: string;
  label: { [key: string]: string[] };
  summary?: { [key: string]: string[] };
  itemCount: number;
  createdAt: string;
  isPublic: boolean;
}>> {
  try {
    const prefix = `collections/${userId}/`;
    const command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
      Delimiter: '/'
    });

    const response = await s3Client.send(command);
    const collections = [];

    if (response.CommonPrefixes) {
      for (const prefix of response.CommonPrefixes) {
        if (!prefix.Prefix) continue;
        
        const collectionId = prefix.Prefix.split('/')[2];
        const collection = await getIIIFCollection(userId, collectionId);
        
        if (collection) {
          const isPublic = collection.metadata?.find(
            m => m.label.ja?.[0] === '公開設定' || m.label.en?.[0] === 'Visibility'
          )?.value.ja?.[0] === '公開' || true;

          const createdAt = collection.metadata?.find(
            m => m.label.ja?.[0] === '作成日' || m.label.en?.[0] === 'Created'
          )?.value.ja?.[0] || new Date().toISOString();

          // Normalize summary to IIIF v3 format if it's in legacy format
          let normalizedSummary: { [key: string]: string[] } | undefined;
          
          if (collection.summary) {
            if (typeof collection.summary === 'object') {
              normalizedSummary = {};
              
              // Process each language key
              for (const [lang, value] of Object.entries(collection.summary)) {
                if (Array.isArray(value)) {
                  // Check if the array contains strings or objects
                  const firstItem = value[0];
                  if (typeof firstItem === 'string') {
                    // Correct IIIF v3 format
                    normalizedSummary[lang] = value;
                  } else if (typeof firstItem === 'object' && firstItem !== null) {
                    // Incorrectly nested object - extract the appropriate language value
                    if (lang === 'ja' && (firstItem as any).ja) {
                      normalizedSummary[lang] = [(firstItem as any).ja];
                    } else if (lang === 'en' && (firstItem as any).en) {
                      normalizedSummary[lang] = [(firstItem as any).en];
                    } else {
                      // Fall back to any available value
                      const extractedValue = (firstItem as any).ja || (firstItem as any).en || (firstItem as any).none;
                      if (extractedValue) {
                        normalizedSummary[lang] = [extractedValue];
                      }
                    }
                  }
                } else if (typeof value === 'string') {
                  // Legacy format - single string value
                  normalizedSummary[lang] = [value];
                }
              }
            }
          }

          collections.push({
            id: collectionId,
            label: collection.label,  // Already in IIIF v3 format
            summary: normalizedSummary,
            itemCount: collection.items.length,
            createdAt,
            isPublic
          });
        }
      }
    }

    return collections.sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  } catch (error) {
    console.error('Error listing collections:', error);
    return [];
  }
}

export async function addItemToCollection(
  userId: string,
  collectionId: string,
  manifestUrl: string,
  itemId: string,
  title: string
): Promise<boolean> {
  try {
    const collection = await getIIIFCollection(userId, collectionId);
    if (!collection) return false;

    const itemReference = {
      id: manifestUrl,
      type: 'Manifest' as const,
      label: {
        ja: [title],
        en: [title]
      },
      manifestId: itemId  // Store the actual item ID for later reference
    };

    collection.items.push(itemReference);

    return await updateIIIFCollection(userId, collectionId, {
      items: collection.items
    });
  } catch (error) {
    console.error('Error adding item to collection:', error);
    return false;
  }
}

export async function updateItemInCollection(
  userId: string,
  collectionId: string,
  itemId: string,
  newTitle: string
): Promise<boolean> {
  try {
    const collection = await getIIIFCollection(userId, collectionId);
    if (!collection) return false;

    // Update the item's title in the collection
    let updated = false;
    collection.items = collection.items.map((item) => {
      // Check if this is the item we need to update
      if (item.manifestId === itemId || 
          (item.id && item.id.includes(itemId))) {
        updated = true;
        return {
          ...item,
          label: {
            ja: [newTitle],
            en: [newTitle]
          }
        };
      }
      return item;
    });

    if (updated) {
      return await updateIIIFCollection(userId, collectionId, {
        items: collection.items
      });
    }
    
    return false;
  } catch (error) {
    console.error('Error updating item in collection:', error);
    return false;
  }
}

export async function removeItemFromCollection(
  userId: string,
  collectionId: string,
  itemId: string
): Promise<boolean> {
  try {
    const collection = await getIIIFCollection(userId, collectionId);
    if (!collection) return false;

    // Remove item by manifestId or by checking the id
    collection.items = collection.items.filter((item) => {
      // Check if manifestId matches
      if (item.manifestId === itemId) return false;
      // Also check if the manifest URL contains the itemId
      if (item.id && item.id.includes(itemId)) return false;
      return true;
    });

    return await updateIIIFCollection(userId, collectionId, {
      items: collection.items
    });
  } catch (error) {
    console.error('Error removing item from collection:', error);
    return false;
  }
}