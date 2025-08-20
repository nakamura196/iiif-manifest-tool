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

    // Upload to S3
    const url = await uploadToS3(key, buffer, file.type);

    return NextResponse.json({
      url,
      width: metadata.width,
      height: metadata.height,
      mimeType: file.type,
      key,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}