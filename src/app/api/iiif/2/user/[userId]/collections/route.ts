import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

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

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = await params;
    const session = await getServerSession(authOptions);
    
    // Allow access to own collections
    const isOwner = session?.user?.id === userId;
    
    if (!isOwner) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Get all collections for the current user
    const collectionsResponse = await fetch(`${baseUrl}/api/collections`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!collectionsResponse.ok) {
      throw new Error('Failed to fetch collections');
    }
    
    const collections = await collectionsResponse.json();
    
    // Fetch all collections with their manifests
    const collectionsWithManifests = await Promise.all(
      collections.map(async (collection: { id: string; name: string; description?: string; isPublic: boolean }) => {
        try {
          // Get the collection details including manifests
          const collectionResponse = await fetch(`${baseUrl}/api/iiif/2/collection/${userId}_${collection.id}`, {
            headers: {
              cookie: request.headers.get('cookie') || '',
            },
          });
          
          if (collectionResponse.ok) {
            const collectionData = await collectionResponse.json();
            return {
              "@id": `${baseUrl}/api/iiif/2/collection/${userId}_${collection.id}`,
              "@type": "sc:Collection",
              "label": [
                {
                  "@language": "ja",
                  "@value": collection.name
                },
                {
                  "@language": "en",
                  "@value": collection.name
                }
              ],
              "manifests": collectionData.manifests || []
            };
          }
        } catch (error) {
          console.error(`Error fetching collection ${collection.id}:`, error);
        }
        
        // Fallback if we can't get the collection details
        return {
          "@id": `${baseUrl}/api/iiif/2/collection/${userId}_${collection.id}`,
          "@type": "sc:Collection",
          "label": [
            {
              "@language": "ja",
              "@value": collection.name
            },
            {
              "@language": "en",
              "@value": collection.name
            }
          ],
          "manifests": []
        };
      })
    );
    
    // Create a v2 root collection for this user
    const rootCollection: IIIFV2Collection = {
      "@context": "http://iiif.io/api/presentation/2/context.json",
      "@id": `${baseUrl}/api/iiif/2/user/${userId}/collections`,
      "@type": "sc:Collection",
      "label": [
        {
          "@language": "ja",
          "@value": `${session.user.name || session.user.email}のコレクション`
        },
        {
          "@language": "en",
          "@value": `${session.user.name || session.user.email}'s Collections`
        }
      ],
      "description": "ユーザーのすべてのコレクション / All collections by this user",
      "collections": collectionsWithManifests,
      "metadata": [
        {
          "label": [
            { "@language": "ja", "@value": "所有者" },
            { "@language": "en", "@value": "Owner" }
          ],
          "value": [
            { "@language": "ja", "@value": session.user.name || session.user.email || "" },
            { "@language": "en", "@value": session.user.name || session.user.email || "" }
          ]
        },
        {
          "label": [
            { "@language": "ja", "@value": "コレクション数" },
            { "@language": "en", "@value": "Collection Count" }
          ],
          "value": [
            { "@language": "ja", "@value": collections.length.toString() },
            { "@language": "en", "@value": collections.length.toString() }
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
    console.error('Error creating user collection:', error);
    return NextResponse.json(
      { error: 'Failed to create user collection' },
      { status: 500 }
    );
  }
}