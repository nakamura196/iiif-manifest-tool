import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch info.json from the external URL
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch info.json' }, { status: 400 });
    }

    const infoJson = await response.json();
    
    return NextResponse.json(infoJson);
  } catch (error) {
    console.error('Error fetching IIIF info.json:', error);
    return NextResponse.json(
      { error: 'Failed to fetch IIIF info.json' },
      { status: 500 }
    );
  }
}