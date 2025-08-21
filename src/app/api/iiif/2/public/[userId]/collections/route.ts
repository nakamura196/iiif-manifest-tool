import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, GetObjectCommand } from '@aws-sdk/client-s3';
import { getUserSettings } from '@/lib/user-settings';

interface RouteParams {
  params: Promise<{ userId: string }>;
}

type IIIFV2Label = string | Array<{ "@language": string; "@value": string }>;

interface IIIFV2Collection {
  "@context": string;
  "@id": string;
  "@type": string;
  label: IIIFV2Label;
  description?: string;
  collections?: Array<{
    "@id": string;
    "@type": string;
    label: IIIFV2Label;
    manifests?: Array<{
      "@id": string;
      "@type": string;
      label: IIIFV2Label;
    }>;
  }>;
  manifests?: Array<{
    "@id": string;
    "@type": string;
    label: IIIFV2Label;
  }>;
  metadata?: Array<{
    label: IIIFV2Label;
    value: IIIFV2Label;
  }>;
}

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Get user settings
    const userSettings = await getUserSettings(userId);
    
    // Get all collections for the user from S3
    const collectionsPrefix = `collections/${userId}/`;
    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: collectionsPrefix,
      Delimiter: '/'
    });
    
    const response = await s3Client.send(listCommand);
    const publicCollections = [];
    
    if (response.CommonPrefixes) {
      // Process each collection
      for (const prefix of response.CommonPrefixes) {
        if (!prefix.Prefix) continue;
        
        const collectionId = prefix.Prefix.split('/')[2]; // Extract collectionId
        
        // Get collection.json to check if it's public
        try {
          const collectionKey = `${prefix.Prefix}collection.json`;
          const getCommand = new GetObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: collectionKey,
          });
          
          const collectionResponse = await s3Client.send(getCommand);
          const collectionData = await collectionResponse.Body?.transformToString();
          
          if (collectionData) {
            const collection = JSON.parse(collectionData);
            
            // Only include public collections
            if (collection['x-access']?.isPublic !== false) {
              // Get the v2 collection with its public manifests
              const collectionV2Response = await fetch(`${baseUrl}/api/iiif/2/collection/${userId}_${collectionId}`);
              
              if (collectionV2Response.ok) {
                const collectionV2 = await collectionV2Response.json();
                
                // Filter only public manifests
                if (collectionV2.manifests) {
                  const publicManifests = [];
                  
                  for (const manifest of collectionV2.manifests) {
                    // Check if manifest is public by fetching it
                    try {
                      const manifestResponse = await fetch(manifest["@id"]);
                      if (manifestResponse.ok) {
                        publicManifests.push(manifest);
                      }
                    } catch {
                      // Skip if can't access
                    }
                  }
                  
                  collectionV2.manifests = publicManifests;
                }
                
                publicCollections.push({
                  "@id": collectionV2["@id"],
                  "@type": "sc:Collection",
                  "label": collectionV2.label,
                  "manifests": collectionV2.manifests || []
                });
              }
            }
          }
        } catch (error) {
          console.error(`Error processing collection ${collectionId}:`, error);
        }
      }
    }
    
    // Create a v2 root collection for public collections
    const rootCollection: IIIFV2Collection = {
      "@context": "http://iiif.io/api/presentation/2/context.json",
      "@id": `${baseUrl}/api/iiif/2/public/${userId}/collections`,
      "@type": "sc:Collection",
      "label": [
        {
          "@language": "ja",
          "@value": userSettings.publicCollectionTitle?.ja || '公開コレクション'
        },
        {
          "@language": "en",
          "@value": userSettings.publicCollectionTitle?.en || 'Public Collections'
        }
      ],
      "description": `${userSettings.publicCollectionDescription?.ja || '公開されているコレクションとマニフェスト'} / ${userSettings.publicCollectionDescription?.en || 'Public collections and manifests'}`,
      "collections": publicCollections,
      "metadata": [
        {
          "label": [
            { "@language": "ja", "@value": "ユーザーID" },
            { "@language": "en", "@value": "User ID" }
          ],
          "value": [
            { "@language": "ja", "@value": userId },
            { "@language": "en", "@value": userId }
          ]
        },
        {
          "label": [
            { "@language": "ja", "@value": "公開コレクション数" },
            { "@language": "en", "@value": "Public Collection Count" }
          ],
          "value": [
            { "@language": "ja", "@value": publicCollections.length.toString() },
            { "@language": "en", "@value": publicCollections.length.toString() }
          ]
        }
      ]
    };
    
    return NextResponse.json(rootCollection, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/2/context.json"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating public collection:', error);
    return NextResponse.json(
      { error: 'Failed to create public collection' },
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