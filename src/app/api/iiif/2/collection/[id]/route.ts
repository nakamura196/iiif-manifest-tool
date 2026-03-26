import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Legacy route: redirects combined ID format to new RESTful format.
 * /api/iiif/2/collection/{userId}_{collectionId}
 *   -> /api/iiif/2/users/{userId}/collections/{collectionId}
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  // Parse the collection ID: userId_collectionId
  const parts = id.includes('_') ? id.split('_') : id.split('-');
  if (parts.length !== 2) {
    return NextResponse.json({ error: 'Invalid collection ID format' }, { status: 400 });
  }

  const [userId, collectionId] = parts;
  const newPath = `/api/iiif/2/users/${userId}/collections/${collectionId}`;
  const url = new URL(newPath, request.url);

  return NextResponse.redirect(url.toString(), 301);
}