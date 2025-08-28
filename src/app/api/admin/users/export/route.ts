import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ListObjectsV2Command, ListObjectsV2CommandOutput, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

// Admin users list (from environment variable)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

interface UserInfo {
  userId: string;
  email?: string;
  name?: string;
  collectionsCount: number;
  itemsCount: number;
  totalSize: number;
  lastActivity?: Date;
}

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams;
    const format = searchParams.get('format') || 'json'; // json, csv, or txt

    // Get all user data from S3
    const userData = await collectUserData();

    // Format and return the data based on requested format
    if (format === 'csv') {
      return exportAsCSV(userData);
    } else if (format === 'txt') {
      return exportAsText(userData);
    } else {
      return exportAsJSON(userData);
    }
  } catch (error) {
    console.error('Error exporting user data:', error);
    return NextResponse.json(
      { error: 'Failed to export user data' },
      { status: 500 }
    );
  }
}

async function collectUserData(): Promise<UserInfo[]> {
  const userMap = new Map<string, UserInfo>();
  
  // First, load all user mappings
  const userMappings = new Map<string, { email?: string; name?: string }>();
  try {
    const mappingCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: 'user-mappings/',
      MaxKeys: 1000,
    });
    
    const mappingResponse = await s3Client.send(mappingCommand);
    
    if (mappingResponse.Contents) {
      for (const object of mappingResponse.Contents) {
        if (object.Key && object.Key.endsWith('.json')) {
          try {
            const getCommand = new GetObjectCommand({
              Bucket: process.env.S3_BUCKET_NAME!,
              Key: object.Key,
            });
            
            const getResponse = await s3Client.send(getCommand);
            if (getResponse.Body) {
              const bodyString = await getResponse.Body.transformToString();
              const mapping = JSON.parse(bodyString);
              
              if (mapping.userId) {
                userMappings.set(mapping.userId, {
                  email: mapping.email,
                  name: mapping.name,
                });
              }
            }
          } catch (error) {
            console.log(`Could not read user mapping for ${object.Key}:`, error);
          }
        }
      }
    }
  } catch (error) {
    console.log('Could not load user mappings:', error);
  }
  
  // Now collect collection data
  let continuationToken: string | undefined = undefined;

  do {
    const listCommand: ListObjectsV2Command = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: 'collections/',
      ContinuationToken: continuationToken,
      MaxKeys: 1000,
    });

    const response: ListObjectsV2CommandOutput = await s3Client.send(listCommand);
    
    if (response.Contents) {
      for (const object of response.Contents) {
        if (object.Key) {
          // Parse the key to extract user ID
          // Format: collections/{userId}/{collectionId}/...
          const parts = object.Key.split('/');
          if (parts.length >= 3) {
            const userId = parts[1];
            
            if (!userMap.has(userId)) {
              // Check if we have a user mapping for this ID
              const mapping = userMappings.get(userId);
              
              userMap.set(userId, {
                userId,
                email: mapping?.email,
                name: mapping?.name,
                collectionsCount: 0,
                itemsCount: 0,
                totalSize: 0,
              });
            }
            
            const userInfo = userMap.get(userId)!;
            
            // Count collections
            if (parts[3] === 'collection.json' || parts[3] === 'metadata.json') {
              userInfo.collectionsCount++;
              
              // Try to get user info from metadata
              if (parts[3] === 'metadata.json') {
                try {
                  const getCommand = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME!,
                    Key: object.Key,
                  });
                  
                  const getResponse = await s3Client.send(getCommand);
                  if (getResponse.Body) {
                    const bodyString = await getResponse.Body.transformToString();
                    const metadata = JSON.parse(bodyString);
                    
                    // Extract email/name from metadata if available
                    if (metadata.userEmail) {
                      userInfo.email = metadata.userEmail;
                    }
                    if (metadata.userName) {
                      userInfo.name = metadata.userName;
                    }
                  }
                } catch (error) {
                  // Ignore errors reading individual files
                  console.log(`Could not read metadata for ${object.Key}`);
                }
              }
            }
            
            // Count items (manifests)
            if (object.Key.includes('/items/') && object.Key.endsWith('/manifest.json')) {
              userInfo.itemsCount++;
            }
            
            // Track total size
            userInfo.totalSize += object.Size || 0;
            
            // Track last activity
            if (object.LastModified) {
              if (!userInfo.lastActivity || object.LastModified > userInfo.lastActivity) {
                userInfo.lastActivity = object.LastModified;
              }
            }
          }
        }
      }
    }

    continuationToken = response.NextContinuationToken;
  } while (continuationToken);

  // Try to match user IDs with session data if possible
  // This would require access to a user database or session store
  // For now, we'll use the Google OAuth user ID format detection
  const users = Array.from(userMap.values());
  
  // Sort by last activity (most recent first)
  users.sort((a, b) => {
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });

  return users;
}

function exportAsJSON(userData: UserInfo[]): NextResponse {
  const exportData = {
    exportDate: new Date().toISOString(),
    totalUsers: userData.length,
    users: userData,
    summary: {
      totalCollections: userData.reduce((sum, user) => sum + user.collectionsCount, 0),
      totalItems: userData.reduce((sum, user) => sum + user.itemsCount, 0),
      totalSize: userData.reduce((sum, user) => sum + user.totalSize, 0),
    }
  };

  return new NextResponse(JSON.stringify(exportData, null, 2), {
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="user-data-${new Date().toISOString().split('T')[0]}.json"`,
    },
  });
}

function exportAsCSV(userData: UserInfo[]): NextResponse {
  // Create CSV header
  let csv = 'User ID,Email,Name,Collections,Items,Total Size (MB),Last Activity\n';
  
  // Add data rows
  for (const user of userData) {
    const sizeInMB = (user.totalSize / (1024 * 1024)).toFixed(2);
    const lastActivity = user.lastActivity ? user.lastActivity.toISOString() : '';
    
    // Escape fields that might contain commas
    const email = user.email ? `"${user.email}"` : '';
    const name = user.name ? `"${user.name}"` : '';
    
    csv += `${user.userId},${email},${name},${user.collectionsCount},${user.itemsCount},${sizeInMB},${lastActivity}\n`;
  }

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv',
      'Content-Disposition': `attachment; filename="user-data-${new Date().toISOString().split('T')[0]}.csv"`,
    },
  });
}

function exportAsText(userData: UserInfo[]): NextResponse {
  let text = '=================================\n';
  text += 'IIIF Management Tool - User Export\n';
  text += `Export Date: ${new Date().toISOString()}\n`;
  text += `Total Users: ${userData.length}\n`;
  text += '=================================\n\n';

  for (const user of userData) {
    text += `User ID: ${user.userId}\n`;
    if (user.email) text += `Email: ${user.email}\n`;
    if (user.name) text += `Name: ${user.name}\n`;
    text += `Collections: ${user.collectionsCount}\n`;
    text += `Items: ${user.itemsCount}\n`;
    text += `Total Size: ${(user.totalSize / (1024 * 1024)).toFixed(2)} MB\n`;
    if (user.lastActivity) {
      text += `Last Activity: ${user.lastActivity.toISOString()}\n`;
    }
    text += '---\n\n';
  }

  return new NextResponse(text, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="user-data-${new Date().toISOString().split('T')[0]}.txt"`,
    },
  });
}

// POST endpoint to update user information
export async function POST(request: NextRequest) {
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

    const { userId, email, name } = await request.json();

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 });
    }

    // Store user mapping in a special metadata file
    const userMappingKey = `user-mappings/${userId}.json`;
    
    const mappingData = {
      userId,
      email,
      name,
      updatedAt: new Date().toISOString(),
      updatedBy: session.user.email,
    };

    const { PutObjectCommand } = await import('@aws-sdk/client-s3');
    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: userMappingKey,
      Body: JSON.stringify(mappingData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: 'User information updated',
      data: mappingData,
    });
  } catch (error) {
    console.error('Error updating user information:', error);
    return NextResponse.json(
      { error: 'Failed to update user information' },
      { status: 500 }
    );
  }
}