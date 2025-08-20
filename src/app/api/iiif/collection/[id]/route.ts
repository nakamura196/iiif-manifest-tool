import { NextRequest } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Default version route - redirects to version specified in env
export async function GET(request: NextRequest, context: RouteParams) {
  // Import and call the versioned handler directly
  const versionedHandler = await import(`../../3/collection/[id]/route`);
  return versionedHandler.GET(request, context);
}