import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import { PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

// This endpoint updates the user mapping when a user logs in
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Create/update user mapping
    const userMappingKey = `user-mappings/${user.id}.json`;

    const mappingData = {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      lastLogin: new Date().toISOString(),
      provider: 'google',
    };
    
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: userMappingKey,
      Body: JSON.stringify(mappingData, null, 2),
      ContentType: 'application/json',
    });
    
    await s3Client.send(command);
    
    return NextResponse.json({
      success: true,
      message: 'User mapping updated',
      userId: user.id,
    });
  } catch (error) {
    console.error('Error updating user mapping:', error);
    return NextResponse.json(
      { error: 'Failed to update user mapping' },
      { status: 500 }
    );
  }
}

// Get user mapping for current user
export async function GET(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userMappingKey = `user-mappings/${user.id}.json`;
    
    try {
      const command = new GetObjectCommand({
        Bucket: process.env.S3_BUCKET_NAME!,
        Key: userMappingKey,
      });
      
      const response = await s3Client.send(command);
      
      if (response.Body) {
        const bodyString = await response.Body.transformToString();
        const mapping = JSON.parse(bodyString);
        
        return NextResponse.json(mapping);
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'NoSuchKey') {
        // No mapping exists yet
        return NextResponse.json({
          userId: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          mappingExists: false,
        });
      }
      throw error;
    }
    
    return NextResponse.json({
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
    });
  } catch (error) {
    console.error('Error getting user mapping:', error);
    return NextResponse.json(
      { error: 'Failed to get user mapping' },
      { status: 500 }
    );
  }
}