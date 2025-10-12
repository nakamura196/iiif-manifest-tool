import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

// Admin users list (from environment variable)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

interface RouteParams {
  params: Promise<{ userId: string; collectionId: string }>;
}

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  try {
    // Check authentication
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user is admin
    if (!ADMIN_EMAILS.includes(session.user.email)) {
      return NextResponse.json({ error: 'Forbidden - Admin access required' }, { status: 403 });
    }

    const { userId, collectionId } = await params;
    const data = await _request.json();

    // Update metadata.json
    const metadataKey = `collections/${userId}/${collectionId}/metadata.json`;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: metadataKey,
      });

      const response = await s3Client.send(getCommand);
      const bodyString = await response.Body?.transformToString();

      if (bodyString) {
        const metadata = JSON.parse(bodyString);

        // Update isPublic if provided
        if (typeof data.isPublic === 'boolean') {
          metadata.isPublic = data.isPublic;
          metadata.updatedAt = new Date().toISOString();
          metadata.updatedBy = session.user.email;

          // Save updated metadata
          const putCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: metadataKey,
            Body: JSON.stringify(metadata, null, 2),
            ContentType: 'application/json'
          });

          await s3Client.send(putCommand);
        }
      }
    } catch (error) {
      console.log('metadata.json not found or error:', error);
    }

    // Update collection.json
    const collectionKey = `collections/${userId}/${collectionId}/collection.json`;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: collectionKey,
      });

      const response = await s3Client.send(getCommand);
      const bodyString = await response.Body?.transformToString();

      if (bodyString) {
        const collection = JSON.parse(bodyString);

        // Update x-access field
        if (typeof data.isPublic === 'boolean') {
          collection['x-access'] = {
            ...collection['x-access'],
            isPublic: data.isPublic,
            owner: userId,
            updatedBy: session.user.email,
            updatedAt: new Date().toISOString()
          };

          // Save updated collection
          const putCommand = new PutObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME!,
            Key: collectionKey,
            Body: JSON.stringify(collection, null, 2),
            ContentType: 'application/json'
          });

          await s3Client.send(putCommand);
        }

        return NextResponse.json({
          success: true,
          message: 'Collection visibility updated',
          isPublic: data.isPublic
        });
      }
    } catch (error) {
      console.error('Error updating collection.json:', error);
      return NextResponse.json(
        { error: 'Collection not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { error: 'Collection not found' },
      { status: 404 }
    );
  } catch (error) {
    console.error('Error updating collection visibility:', error);
    return NextResponse.json(
      { error: 'Failed to update collection visibility' },
      { status: 500 }
    );
  }
}
