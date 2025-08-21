import { NextRequest, NextResponse } from 'next/server';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';

// Create S3 client
const s3Client = new S3Client({
  endpoint: process.env.MDX_S3_ENDPOINT || undefined,
  region: process.env.MDX_S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.MDX_S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.MDX_S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: process.env.MDX_S3_ENDPOINT ? true : false,
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const resolvedParams = await params;
  const path = resolvedParams.path.join('/');

  try {
    // Get object from S3 using AWS SDK
    const command = new GetObjectCommand({
      Bucket: process.env.MDX_S3_BUCKET_NAME!,
      Key: path,
    });

    const response = await s3Client.send(command);
    
    if (!response.Body) {
      return new NextResponse('Not Found', { status: 404 });
    }

    // Convert stream to buffer
    const chunks = [];
    for await (const chunk of response.Body as AsyncIterable<Uint8Array>) {
      chunks.push(chunk);
    }
    const buffer = Buffer.concat(chunks);

    // Return the proxied content with appropriate headers
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': response.ContentType || 'application/octet-stream',
        'Cache-Control': 'public, max-age=31536000, immutable',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    const err = error as { name?: string; $metadata?: { httpStatusCode?: number } };
    if (err.name === 'NoSuchKey' || err.$metadata?.httpStatusCode === 404) {
      return new NextResponse('Not Found', { status: 404 });
    }
    console.error('Error proxying S3 content:', error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}