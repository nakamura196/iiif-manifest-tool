import { NextRequest, NextResponse } from 'next/server';
import { parseCombinedId } from '@/lib/iiif-ids';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * Legacy route: redirects combined ID format to new RESTful format.
 * /api/iiif/2/{userId}_{collectionId}_{itemId}/manifest
 *   -> /api/iiif/2/users/{userId}/collections/{collectionId}/items/{itemId}/manifest
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const parsed = parseCombinedId(id);
  if (!parsed) {
    return NextResponse.json({ error: 'Invalid manifest ID format' }, { status: 400 });
  }

  const { userId, collectionId, itemId } = parsed;
  const newPath = `/api/iiif/2/users/${userId}/collections/${collectionId}/items/${itemId}/manifest`;
  const url = new URL(newPath, request.url);

  return NextResponse.redirect(url.toString(), 301);
}