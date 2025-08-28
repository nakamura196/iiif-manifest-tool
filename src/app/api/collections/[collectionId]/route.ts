import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

interface RouteParams {
  params: Promise<{ collectionId: string }>;
}

// Helper function to clean multilingual text format
function cleanMultilingualText(text: unknown): { [key: string]: string[] } {
  if (!text || typeof text !== 'object') return {};
  
  const result: { [key: string]: string[] } = {};
  
  for (const [lang, value] of Object.entries(text)) {
    if (Array.isArray(value)) {
      // Check if array contains strings or nested objects
      const cleanedValues = value.map(v => {
        if (typeof v === 'string') {
          return v;
        } else if (typeof v === 'object' && v !== null) {
          // If it's a nested object, try to extract the appropriate value
          const obj = v as Record<string, unknown>;
          return (obj[lang] as string) || (obj.ja as string) || (obj.en as string) || '';
        }
        return '';
      }).filter(v => v !== '');
      
      if (cleanedValues.length > 0) {
        result[lang] = cleanedValues;
      }
    } else if (typeof value === 'string') {
      result[lang] = [value];
    } else if (typeof value === 'object' && value !== null) {
      // Handle nested object case
      const valObj = value as Record<string, unknown>;
      const extractedValue = valObj[lang] || valObj.ja || valObj.en;
      if (extractedValue && typeof extractedValue === 'string') {
        result[lang] = [extractedValue];
      }
    }
  }
  
  return result;
}


export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await params;
    
    // First try to get collection metadata from S3
    const metadataKey = `collections/${session.user.id}/${collectionId}/metadata.json`;
    
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: metadataKey,
      });
      
      const response = await s3Client.send(command);
      const bodyString = await response.Body?.transformToString();
      
      if (bodyString) {
        const metadata = JSON.parse(bodyString);
        
        // Fix any nested format issues in label and summary
        if (metadata.label) {
          metadata.label = cleanMultilingualText(metadata.label);
        }
        if (metadata.summary) {
          metadata.summary = cleanMultilingualText(metadata.summary);
        }
        
        // Clean customFields if they exist
        if (metadata.metadata?.customFields) {
          metadata.metadata.customFields = metadata.metadata.customFields.map((field: unknown) => {
            const f = field as { label: unknown; value: unknown };
            return {
              label: cleanMultilingualText(f.label),
              value: cleanMultilingualText(f.value)
            };
          });
        }
        
        return NextResponse.json(metadata);
      }
    } catch {
      // If metadata.json doesn't exist, try to get collection.json
    }
    
    // Try to get collection manifest from S3
    const collectionKey = `collections/${session.user.id}/${collectionId}/collection.json`;
    
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: collectionKey,
      });
      
      const response = await s3Client.send(command);
      const bodyString = await response.Body?.transformToString();
      
      if (bodyString) {
        const collection = JSON.parse(bodyString);
        
        // Extract metadata from IIIF collection
        const isPublic = collection.metadata?.find(
          (m: { label: { ja?: string[]; en?: string[] }; value: { ja?: string[]; en?: string[] } }) => 
            m.label.ja?.[0] === '公開設定' || m.label.en?.[0] === 'Visibility'
        )?.value.ja?.[0] === '公開' || collection['x-access']?.isPublic || true;
        
        // Extract custom fields from IIIF metadata
        // Exclude system fields like '作成日', '更新日', '公開設定'
        const systemLabels = ['作成日', '更新日', '公開設定', 'Created', 'Updated', 'Visibility'];
        const customFields = collection.metadata?.filter(
          (m: { label: { [key: string]: string[] }; value: { [key: string]: string[] } }) => {
            // Check if this is a system field
            const isSystemField = Object.values(m.label).some(
              labels => labels.some(label => systemLabels.includes(label))
            );
            return !isSystemField;
          }
        ).map((m: { label: { [key: string]: string[] }; value: { [key: string]: string[] } }) => ({
          label: cleanMultilingualText(m.label),
          value: cleanMultilingualText(m.value)
        })) || [];
        
        return NextResponse.json({
          id: collectionId,
          name: collection.label?.ja?.[0] || collection.label?.en?.[0] || 'Collection',
          description: collection.summary?.ja?.[0] || collection.summary?.en?.[0] || '',
          label: cleanMultilingualText(collection.label),
          summary: cleanMultilingualText(collection.summary),
          isPublic,
          metadata: {
            attribution: collection.attribution,
            rights: collection.rights,
            requiredStatement: collection.requiredStatement,
            homepage: collection.homepage,
            seeAlso: collection.seeAlso,
            provider: collection.provider,
            customFields
          }
        });
      }
    } catch (error) {
      console.error('Error fetching collection manifest:', error);
    }
    
    // Return default data if nothing found
    return NextResponse.json({
      id: collectionId,
      name: 'Collection',
      description: '',
      isPublic: true,
      metadata: {}
    });
  } catch (error) {
    console.error('Error fetching collection:', error);
    return NextResponse.json(
      { error: 'Failed to fetch collection' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await params;
    const data = await request.json();
    
    // Store collection metadata in S3
    const metadataKey = `collections/${session.user.id}/${collectionId}/metadata.json`;
    
    // Clean the data to ensure proper format
    const cleanedData = {
      label: data.label ? cleanMultilingualText(data.label) : {},
      summary: data.summary ? cleanMultilingualText(data.summary) : {},
      isPublic: data.isPublic ?? true,
      metadata: data.metadata || {}
    };
    
    const collectionData = {
      id: collectionId,
      userId: session.user.id,
      ...cleanedData,
      updatedAt: new Date().toISOString()
    };
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: metadataKey,
      Body: JSON.stringify(collectionData, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    
    // Also update the collection manifest if it exists
    const collectionManifestKey = `collections/${session.user.id}/${collectionId}/collection.json`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: collectionManifestKey,
      });
      
      const response = await s3Client.send(getCommand);
      const bodyString = await response.Body?.transformToString();
      
      if (bodyString) {
        const collectionManifest = JSON.parse(bodyString);
        
        // Update collection manifest with new metadata
        // Use cleaned data for consistency
        if (cleanedData.label && Object.keys(cleanedData.label).length > 0) {
          collectionManifest.label = cleanedData.label;
        }
        
        if (cleanedData.summary && Object.keys(cleanedData.summary).length > 0) {
          collectionManifest.summary = cleanedData.summary;
        }
        
        // Skip the old label/summary handling since we're using cleaned data
        /*
        if (data.label) {
          // Check if it's already in IIIF format (has arrays)
          if (typeof data.label === 'object' && !Array.isArray(data.label)) {
            // Check if values are already arrays
            const hasArrays = Object.values(data.label).some(v => Array.isArray(v));
            if (hasArrays) {
              // Already in IIIF format, ensure values are strings
              collectionManifest.label = {};
              for (const [lang, value] of Object.entries(data.label)) {
                if (Array.isArray(value)) {
                  collectionManifest.label[lang] = value.filter((v: any) => typeof v === 'string');
                } else if (typeof value === 'string') {
                  collectionManifest.label[lang] = [value];
                }
              }
            } else {
              // Convert from {ja: string, en: string} to {ja: [string], en: [string]}
              collectionManifest.label = {};
              for (const [lang, value] of Object.entries(data.label)) {
                if (value && typeof value === 'string') {
                  collectionManifest.label[lang] = [value];
                }
              }
            }
          }
        } else if (data.name) {
          collectionManifest.label = {
            ja: [data.name],
            en: [data.name]
          };
        }
        
        // Handle summary - convert from edit format to IIIF format if needed  
        if (data.summary) {
          // Check if it's already in IIIF format (has arrays)
          if (typeof data.summary === 'object' && !Array.isArray(data.summary)) {
            const hasArrays = Object.values(data.summary).some(v => Array.isArray(v));
            if (hasArrays) {
              // Already in IIIF format, but check for nested objects
              collectionManifest.summary = {};
              for (const [lang, value] of Object.entries(data.summary)) {
                if (Array.isArray(value)) {
                  // Check if array contains strings or objects
                  const firstItem = value[0];
                  if (typeof firstItem === 'string') {
                    collectionManifest.summary[lang] = value;
                  } else if (typeof firstItem === 'object' && firstItem !== null) {
                    // Nested object found - extract the appropriate value
                    const extractedValue = (firstItem as any)[lang] || (firstItem as any).ja || (firstItem as any).en;
                    if (extractedValue) {
                      collectionManifest.summary[lang] = [extractedValue];
                    }
                  }
                } else if (typeof value === 'string') {
                  collectionManifest.summary[lang] = [value];
                }
              }
            } else {
              // Convert from {ja: string, en: string} to {ja: [string], en: [string]}
              collectionManifest.summary = {};
              for (const [lang, value] of Object.entries(data.summary)) {
                if (value && typeof value === 'string') {
                  collectionManifest.summary[lang] = [value];
                }
              }
            }
          }
        }
        */
        
        // Add IIIF metadata fields
        if (cleanedData.metadata) {
          if (cleanedData.metadata.attribution) {
            collectionManifest.attribution = cleanedData.metadata.attribution;
          }
          
          if (cleanedData.metadata.rights) {
            collectionManifest.rights = cleanedData.metadata.rights;
          }
          
          if (cleanedData.metadata.requiredStatement) {
            collectionManifest.requiredStatement = cleanedData.metadata.requiredStatement;
          }
          
          if (cleanedData.metadata.homepage) {
            collectionManifest.homepage = cleanedData.metadata.homepage;
          }
          
          if (cleanedData.metadata.seeAlso) {
            collectionManifest.seeAlso = cleanedData.metadata.seeAlso;
          }
          
          if (cleanedData.metadata.provider) {
            collectionManifest.provider = cleanedData.metadata.provider;
          }
          
          // Add custom metadata fields to IIIF metadata array
          if (cleanedData.metadata.customFields && cleanedData.metadata.customFields.length > 0) {
            collectionManifest.metadata = [
              ...(collectionManifest.metadata || []),
              ...cleanedData.metadata.customFields
                .filter((field: unknown) => {
                  const f = field as { label?: { [key: string]: string[] }; value?: { [key: string]: string[] } };
                  // Check if field has any non-empty label or value in any language
                  const hasLabel = f.label && Object.keys(f.label).some(
                    (lang: string) => f.label![lang] && f.label![lang].length > 0
                  );
                  const hasValue = f.value && Object.keys(f.value).some(
                    (lang: string) => f.value![lang] && f.value![lang].length > 0
                  );
                  return hasLabel && hasValue;
                })
                .map((field: unknown) => {
                  const f = field as { label?: { [key: string]: string[] }; value?: { [key: string]: string[] } };
                  return {
                    label: f.label || {},
                    value: f.value || {}
                  };
                })
            ];
          }
        }
        
        // Save updated collection manifest
        const updateCommand = new PutObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: collectionManifestKey,
          Body: JSON.stringify(collectionManifest, null, 2),
          ContentType: 'application/json'
        });
        
        await s3Client.send(updateCommand);
      }
    } catch {
      // Collection manifest might not exist yet, that's okay
      console.log('Collection manifest not found, will be created when first item is added');
    }
    
    return NextResponse.json(collectionData);
  } catch (error) {
    console.error('Error updating collection:', error);
    return NextResponse.json(
      { error: 'Failed to update collection' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await params;
    
    // Delete collection metadata from S3
    // const metadataKey = `collections/${session.user.id}/${collectionId}/metadata.json`;
    // const collectionKey = `collections/${session.user.id}/${collectionId}/collection.json`;
    
    // Import DeleteObjectCommand from AWS SDK
    const { DeleteObjectCommand, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
    
    // List all objects in the collection folder
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: `collections/${session.user.id}/${collectionId}/`,
    });
    
    const listResponse = await s3Client.send(listCommand);
    
    // Delete all objects in the collection folder
    if (listResponse.Contents) {
      for (const object of listResponse.Contents) {
        if (object.Key) {
          const deleteCommand = new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: object.Key,
          });
          await s3Client.send(deleteCommand);
        }
      }
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting collection:', error);
    return NextResponse.json(
      { error: 'Failed to delete collection' },
      { status: 500 }
    );
  }
}