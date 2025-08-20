import { NextRequest } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Default version route - redirects to version specified in env
export async function GET(request: NextRequest, context: RouteParams) {
  const defaultVersion = process.env.IIIF_API_VERSION || '3';
  
  // Import and call the versioned handler directly
  const versionedHandler = await import(`../../${defaultVersion}/collection/[id]/route`);
  return versionedHandler.GET(request, context);
}