import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ListObjectsV2Command, ListObjectsV2CommandOutput, GetObjectCommand } from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

// Admin users list (from environment variable)
const ADMIN_EMAILS = process.env.ADMIN_EMAILS?.split(',') || [];

interface CollectionInfo {
  id: string;
  name: string;
  isPublic: boolean;
  itemsCount: number;
  createdAt?: Date;
}

interface UserInfo {
  userId: string;
  email?: string;
  name?: string;
  collectionsCount: number;
  itemsCount: number;
  totalSize: number;
  lastActivity?: Date;
  collections?: CollectionInfo[];
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
    const includeCollections = searchParams.get('includeCollections') === 'true';
    const userId = searchParams.get('userId');

    // Get user data from S3
    const userData = await collectUserData(includeCollections, userId || undefined);

    return NextResponse.json({
      success: true,
      data: userData,
      totalUsers: userData.length,
    });
  } catch (error) {
    console.error('Error fetching user data:', error);
    return NextResponse.json(
      { error: 'Failed to fetch user data' },
      { status: 500 }
    );
  }
}

async function collectUserData(includeCollections: boolean = false, specificUserId?: string): Promise<UserInfo[]> {
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
    const prefix = specificUserId ? `collections/${specificUserId}/` : 'collections/';

    const listCommand = new ListObjectsV2Command({
      Bucket: process.env.S3_BUCKET_NAME!,
      Prefix: prefix,
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
            const collectionId = parts[2];

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
                collections: includeCollections ? [] : undefined,
              });
            }

            const userInfo = userMap.get(userId)!;

            // Count collections and get collection details
            if (parts[3] === 'collection.json') {
              userInfo.collectionsCount++;

              if (includeCollections) {
                try {
                  const getCommand = new GetObjectCommand({
                    Bucket: process.env.S3_BUCKET_NAME!,
                    Key: object.Key,
                  });

                  const getResponse = await s3Client.send(getCommand);
                  if (getResponse.Body) {
                    const bodyString = await getResponse.Body.transformToString();
                    const collectionData = JSON.parse(bodyString);

                    // Count items in this collection
                    const itemsPrefix = `collections/${userId}/${collectionId}/items/`;
                    const itemsListCommand = new ListObjectsV2Command({
                      Bucket: process.env.S3_BUCKET_NAME!,
                      Prefix: itemsPrefix,
                    });

                    const itemsResponse = await s3Client.send(itemsListCommand);
                    const itemsCount = itemsResponse.Contents?.filter(
                      obj => obj.Key?.endsWith('/manifest.json')
                    ).length || 0;

                    // Extract collection name from label
                    let collectionName = 'Untitled';
                    if (collectionData.label) {
                      if (typeof collectionData.label === 'string') {
                        collectionName = collectionData.label;
                      } else if (typeof collectionData.label === 'object') {
                        collectionName = collectionData.label.ja?.[0] ||
                                       collectionData.label.en?.[0] ||
                                       collectionData.label.none?.[0] ||
                                       'Untitled';
                      }
                    }

                    userInfo.collections?.push({
                      id: collectionId,
                      name: collectionName,
                      isPublic: collectionData['x-access']?.isPublic ?? true,
                      itemsCount: itemsCount,
                      createdAt: object.LastModified,
                    });
                  }
                } catch (error) {
                  console.log(`Could not read collection for ${object.Key}`);
                }
              }
            }

            // Get user info from metadata
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
                  if (metadata.userEmail && !userInfo.email) {
                    userInfo.email = metadata.userEmail;
                  }
                  if (metadata.userName && !userInfo.name) {
                    userInfo.name = metadata.userName;
                  }
                }
              } catch (error) {
                console.log(`Could not read metadata for ${object.Key}`);
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

  const users = Array.from(userMap.values());

  // Sort collections by creation date (most recent first)
  if (includeCollections) {
    users.forEach(user => {
      user.collections?.sort((a, b) => {
        if (!a.createdAt) return 1;
        if (!b.createdAt) return -1;
        return b.createdAt.getTime() - a.createdAt.getTime();
      });
    });
  }

  // Sort users by last activity (most recent first)
  users.sort((a, b) => {
    if (!a.lastActivity) return 1;
    if (!b.lastActivity) return -1;
    return b.lastActivity.getTime() - a.lastActivity.getTime();
  });

  return users;
}
