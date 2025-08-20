import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

interface RouteParams {
  params: Promise<{ collectionId: string }>;
}


export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { collectionId } = await params;
    
    // Try to get collection metadata from S3
    const metadataKey = `collections/${session.user.id}/${collectionId}/metadata.json`;
    
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.MDX_S3_BUCKET_NAME!,
        Key: metadataKey,
      });
      
      const response = await s3Client.send(command);
      const bodyString = await response.Body?.transformToString();
      
      if (bodyString) {
        return NextResponse.json(JSON.parse(bodyString));
      }
    } catch {
      // If file doesn't exist, return mock data
    }
    
    // Return mock collection data
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
    
    const collectionData = {
      id: collectionId,
      userId: session.user.id,
      ...data,
      updatedAt: new Date().toISOString()
    };
    
    const command = new PutObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
      Key: metadataKey,
      Body: JSON.stringify(collectionData, null, 2),
      ContentType: 'application/json'
    });
    
    await s3Client.send(command);
    
    // Also update the collection manifest if it exists
    const collectionManifestKey = `collections/${session.user.id}/${collectionId}/collection.json`;
    
    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.MDX_S3_BUCKET_NAME!,
        Key: collectionManifestKey,
      });
      
      const response = await s3Client.send(getCommand);
      const bodyString = await response.Body?.transformToString();
      
      if (bodyString) {
        const collectionManifest = JSON.parse(bodyString);
        
        // Update collection manifest with new metadata
        collectionManifest.label = {
          ja: [data.name],
          en: [data.name]
        };
        
        if (data.description) {
          collectionManifest.summary = {
            ja: [data.description],
            en: [data.description]
          };
        }
        
        // Add IIIF metadata fields
        if (data.metadata) {
          if (data.metadata.attribution) {
            collectionManifest.attribution = data.metadata.attribution;
          }
          
          if (data.metadata.rights) {
            collectionManifest.rights = data.metadata.rights;
          }
          
          if (data.metadata.requiredStatement) {
            collectionManifest.requiredStatement = data.metadata.requiredStatement;
          }
          
          if (data.metadata.homepage) {
            collectionManifest.homepage = data.metadata.homepage;
          }
          
          if (data.metadata.seeAlso) {
            collectionManifest.seeAlso = data.metadata.seeAlso;
          }
          
          if (data.metadata.provider) {
            collectionManifest.provider = data.metadata.provider;
          }
          
          // Add custom metadata fields to IIIF metadata array
          if (data.metadata.customFields && data.metadata.customFields.length > 0) {
            collectionManifest.metadata = [
              ...(collectionManifest.metadata || []),
              ...data.metadata.customFields
                .filter((field: { label: string; value: string }) => field.label && field.value)
                .map((field: { label: string; value: string }) => ({
                  label: { ja: [field.label] },
                  value: { ja: [field.value] }
                }))
            ];
          }
        }
        
        // Save updated collection manifest
        const updateCommand = new PutObjectCommand({
          Bucket: process.env.MDX_S3_BUCKET_NAME!,
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