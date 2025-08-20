import { NextRequest, NextResponse } from 'next/server';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// Default version route - redirects to version specified in env
export async function GET(request: NextRequest, context: RouteParams) {
  try {
    // Import and call the versioned handler directly
    const versionedHandler = await import(`@/app/api/iiif/3/[id]/manifest/route`);
    return versionedHandler.GET(request, context);
  } catch (error) {
    console.error('Error in manifest route:', error);
    return NextResponse.json(
      { error: 'Internal server error', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}