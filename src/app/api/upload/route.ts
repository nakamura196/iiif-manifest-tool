import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { uploadToS3 } from '@/lib/s3';
import { v4 as uuidv4 } from 'uuid';
import sharp from 'sharp';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    // Process image with sharp to get metadata
    const image = sharp(buffer);
    const metadata = await image.metadata();
    
    // Generate unique filename
    const fileExtension = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExtension}`;
    const key = `images/${session.user.id}/${fileName}`;
    const thumbnailKey = `images/${session.user.id}/thumbnails/${fileName}`;

    // Create thumbnail (max 400px on longest side, maintaining aspect ratio)
    const thumbnailBuffer = await sharp(buffer)
      .resize(400, 400, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 85 })
      .toBuffer();
    
    const thumbnailMetadata = await sharp(thumbnailBuffer).metadata();

    // Upload both original and thumbnail to S3
    const [url, thumbnailUrl] = await Promise.all([
      uploadToS3(key, buffer, file.type),
      uploadToS3(thumbnailKey, thumbnailBuffer, 'image/jpeg')
    ]);

    return NextResponse.json({
      url,
      thumbnailUrl,
      width: metadata.width,
      height: metadata.height,
      thumbnailWidth: thumbnailMetadata.width,
      thumbnailHeight: thumbnailMetadata.height,
      mimeType: file.type,
      key,
      thumbnailKey,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}