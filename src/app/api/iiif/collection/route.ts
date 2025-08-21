import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    
    // Get all user's collections
    const collectionsResponse = await fetch(`${baseUrl}/api/collections`, {
      headers: {
        cookie: request.headers.get('cookie') || '',
      },
    });
    
    if (!collectionsResponse.ok) {
      throw new Error('Failed to fetch collections');
    }
    
    const collections = await collectionsResponse.json();
    
    // Create a root collection that contains all user's collections
    const rootCollection = {
      "@context": "http://iiif.io/api/presentation/3/context.json",
      "id": `${baseUrl}/api/iiif/collection`,
      "type": "Collection",
      "label": {
        "ja": [`${session.user.name || session.user.email}のコレクション`],
        "en": [`${session.user.name || session.user.email}'s Collections`]
      },
      "summary": {
        "ja": ["すべてのコレクションを含むルートコレクション"],
        "en": ["Root collection containing all collections"]
      },
      "items": collections.map((collection: { id: string; name: string; description?: string }) => ({
        "id": `${baseUrl}/api/iiif/collection/${session.user.id}_${collection.id}`,
        "type": "Collection",
        "label": {
          "ja": [collection.name],
          "en": [collection.name]
        }
      })),
      "metadata": [
        {
          "label": { "ja": ["所有者"], "en": ["Owner"] },
          "value": { "ja": [session.user.name || session.user.email || ""], "en": [session.user.name || session.user.email || ""] }
        },
        {
          "label": { "ja": ["コレクション数"], "en": ["Collection Count"] },
          "value": { "ja": [collections.length.toString()], "en": [collections.length.toString()] }
        }
      ]
    };
    
    return NextResponse.json(rootCollection, {
      headers: {
        'Content-Type': 'application/ld+json;profile="http://iiif.io/api/presentation/3/context.json"',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  } catch (error) {
    console.error('Error creating root collection:', error);
    return NextResponse.json(
      { error: 'Failed to create root collection' },
      { status: 500 }
    );
  }
}