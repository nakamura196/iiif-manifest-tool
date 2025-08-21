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
    
    // Allow access to own collections or when accessing without authentication
    const isOwner = session?.user?.id === userId;
    
    // For now, allow public access to user collections for Self Museum
    // In the future, you might want to check if collections are public
    // if (!isOwner) {
    //   return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    // }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Get collections based on whether the user is authenticated
    let collections = [];
    
    if (isOwner && session) {
      // If owner, get all collections using authenticated endpoint
      const collectionsResponse = await fetch(`${baseUrl}/api/collections`, {
        headers: {
          cookie: request.headers.get('cookie') || '',
        },
      });
      
      if (collectionsResponse.ok) {
        collections = await collectionsResponse.json();
      }
    } else {
      // For public access, we need to get public collections
      // For now, return empty since we don't have a public collections endpoint
      // TODO: Create an endpoint to fetch public collections for a user
      collections = [];
    }
    
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
          "@value": `${session?.user?.name || session?.user?.email || `ユーザー ${userId}`}のコレクション`
        },
        {
          "@language": "en",
          "@value": `${session?.user?.name || session?.user?.email || `User ${userId}`}'s Collections`
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
            { "@language": "ja", "@value": session?.user?.name || session?.user?.email || `ユーザー ${userId}` },
            { "@language": "en", "@value": session?.user?.name || session?.user?.email || `User ${userId}` }
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

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}