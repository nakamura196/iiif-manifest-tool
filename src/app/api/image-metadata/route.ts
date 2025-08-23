import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { url } = await request.json();

    if (!url) {
      return NextResponse.json({ error: 'URL is required' }, { status: 400 });
    }

    // Fetch image from the external URL
    const response = await fetch(url);
    
    if (!response.ok) {
      return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 });
    }

    const contentType = response.headers.get('content-type') || 'image/jpeg';
    const buffer = await response.arrayBuffer();
    
    // Create a base64 data URL for the image
    const base64 = Buffer.from(buffer).toString('base64');
    const dataUrl = `data:${contentType};base64,${base64}`;

    // Get image dimensions using sharp if available, otherwise return default dimensions
    let width = 1920;
    let height = 1080;
    
    try {
      // Dynamically import sharp if available
      const sharp = (await import('sharp')).default;
      const metadata = await sharp(Buffer.from(buffer)).metadata();
      width = metadata.width || 1920;
      height = metadata.height || 1080;
    } catch {
      // Sharp not available, use default dimensions
      console.log('Sharp not available, using default dimensions');
    }

    return NextResponse.json({
      url,
      width,
      height,
      mimeType: contentType,
      dataUrl // Return data URL for client-side processing
    });
  } catch (error) {
    console.error('Error fetching image metadata:', error);
    return NextResponse.json(
      { error: 'Failed to fetch image metadata' },
      { status: 500 }
    );
  }
}