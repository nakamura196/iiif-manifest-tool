import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { deleteFromS3 } from '@/lib/s3';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { imageUrls } = await request.json();
    
    if (!imageUrls || !Array.isArray(imageUrls)) {
      return NextResponse.json({ error: 'Invalid image URLs' }, { status: 400 });
    }

    // Extract S3 keys from URLs
    const keysToDelete = imageUrls
      .map(url => {
        // Handle proxy URLs (/api/proxy/s3/...)
        if (url.startsWith('/api/proxy/s3/')) {
          return url.replace('/api/proxy/s3/', '');
        }
        // Handle direct S3 URLs
        const match = url.match(/images\/[^/]+\/.+$/);
        return match ? match[0] : null;
      })
      .filter(key => key !== null);

    // Delete each image from S3
    const deletePromises = keysToDelete.map(key => {
      console.log('Deleting S3 object:', key);
      return deleteFromS3(key).catch(error => {
        console.error(`Failed to delete ${key}:`, error);
        return null; // Continue with other deletions even if one fails
      });
    });

    await Promise.all(deletePromises);

    return NextResponse.json({ 
      success: true, 
      deletedCount: keysToDelete.length 
    });
  } catch (error) {
    console.error('Error cleaning up images:', error);
    return NextResponse.json(
      { error: 'Failed to clean up images' },
      { status: 500 }
    );
  }
}