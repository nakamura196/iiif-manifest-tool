import { NextRequest, NextResponse } from 'next/server';
import { getAuthUser } from '@/lib/auth-helpers';
import {
  PutObjectCommand,
  GetObjectCommand,
  ListObjectsV2Command,
  CopyObjectCommand,
} from '@aws-sdk/client-s3';
import { s3Client } from '@/lib/s3';

/**
 * Check if a userId looks like an old Google numeric ID (all digits).
 * Firebase UIDs are alphanumeric and typically 28 characters.
 */
function isGoogleNumericId(userId: string): boolean {
  return /^\d+$/.test(userId);
}

/**
 * Find an old user mapping with the same email but a different (numeric) userId.
 * Scans all user-mapping JSON files in S3.
 */
async function findOldMappingByEmail(
  email: string,
  currentUserId: string
): Promise<{ userId: string; key: string } | null> {
  if (!email) return null;

  const bucket = process.env.S3_BUCKET_NAME!;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: 'user-mappings/',
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    for (const obj of listResponse.Contents ?? []) {
      if (!obj.Key || !obj.Key.endsWith('.json')) continue;

      // Extract userId from key: user-mappings/{userId}.json
      const fileName = obj.Key.replace('user-mappings/', '').replace('.json', '');

      // Skip the current user's own mapping
      if (fileName === currentUserId) continue;

      // Only consider numeric IDs (old Google auth)
      if (!isGoogleNumericId(fileName)) continue;

      try {
        const getCommand = new GetObjectCommand({
          Bucket: bucket,
          Key: obj.Key,
        });
        const getResponse = await s3Client.send(getCommand);
        if (getResponse.Body) {
          const bodyString = await getResponse.Body.transformToString();
          const mapping = JSON.parse(bodyString);
          if (mapping.email === email) {
            return { userId: fileName, key: obj.Key };
          }
        }
      } catch {
        // Skip unreadable mappings
        continue;
      }
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return null;
}

/**
 * Copy all S3 objects under collections/{oldId}/ to collections/{newId}/.
 * Does not delete old data (kept as backup).
 * Returns the number of objects copied.
 */
async function copyCollectionData(
  oldUserId: string,
  newUserId: string
): Promise<number> {
  const bucket = process.env.S3_BUCKET_NAME!;
  const sourcePrefix = `collections/${oldUserId}/`;
  const targetPrefix = `collections/${newUserId}/`;
  let copied = 0;
  let continuationToken: string | undefined;

  do {
    const listCommand = new ListObjectsV2Command({
      Bucket: bucket,
      Prefix: sourcePrefix,
      ContinuationToken: continuationToken,
    });

    const listResponse = await s3Client.send(listCommand);

    for (const obj of listResponse.Contents ?? []) {
      if (!obj.Key) continue;

      const relativePath = obj.Key.slice(sourcePrefix.length);
      const targetKey = `${targetPrefix}${relativePath}`;

      try {
        const copyCommand = new CopyObjectCommand({
          Bucket: bucket,
          CopySource: `${bucket}/${obj.Key}`,
          Key: targetKey,
        });
        await s3Client.send(copyCommand);
        copied++;
      } catch (error) {
        console.error(`Failed to copy ${obj.Key} to ${targetKey}:`, error);
      }
    }

    continuationToken = listResponse.IsTruncated
      ? listResponse.NextContinuationToken
      : undefined;
  } while (continuationToken);

  return copied;
}

/**
 * Check if the user needs data migration and perform it if so.
 * Only runs for non-numeric (Firebase) user IDs that haven't been migrated yet.
 */
async function checkAndMigrateUserData(
  newUserId: string,
  email: string
): Promise<{ migrated: boolean; migratedFrom?: string; objectsCopied?: number }> {
  // Only migrate for Firebase UIDs (non-numeric), not old Google numeric IDs
  if (isGoogleNumericId(newUserId)) {
    return { migrated: false };
  }

  // Check if already migrated by reading the current user mapping
  const bucket = process.env.S3_BUCKET_NAME!;
  try {
    const getCommand = new GetObjectCommand({
      Bucket: bucket,
      Key: `user-mappings/${newUserId}.json`,
    });
    const getResponse = await s3Client.send(getCommand);
    if (getResponse.Body) {
      const bodyString = await getResponse.Body.transformToString();
      const existing = JSON.parse(bodyString);
      if (existing.migratedFrom) {
        // Already migrated, skip
        return { migrated: false };
      }
    }
  } catch {
    // No existing mapping, continue with migration check
  }

  // Look for an old mapping with the same email
  const oldMapping = await findOldMappingByEmail(email, newUserId);
  if (!oldMapping) {
    return { migrated: false };
  }

  console.log(
    `[user-migration] Found old mapping for ${email}: ${oldMapping.userId} -> ${newUserId}`
  );

  // Copy collection data from old path to new path
  const objectsCopied = await copyCollectionData(oldMapping.userId, newUserId);

  console.log(
    `[user-migration] Copied ${objectsCopied} objects from collections/${oldMapping.userId}/ to collections/${newUserId}/`
  );

  return {
    migrated: true,
    migratedFrom: oldMapping.userId,
    objectsCopied,
  };
}

// This endpoint updates the user mapping when a user logs in
export async function POST(request: NextRequest) {
  try {
    const user = await getAuthUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check and perform migration before saving the new mapping
    const migration = await checkAndMigrateUserData(user.id, user.email);

    // Create/update user mapping
    const userMappingKey = `user-mappings/${user.id}.json`;

    const mappingData: Record<string, unknown> = {
      userId: user.id,
      email: user.email,
      name: user.name,
      image: user.image,
      lastLogin: new Date().toISOString(),
      provider: 'google',
    };

    // Record migration info so we don't run it again
    if (migration.migrated && migration.migratedFrom) {
      mappingData.migratedFrom = migration.migratedFrom;
      mappingData.migratedAt = new Date().toISOString();
      mappingData.objectsCopied = migration.objectsCopied;
    } else {
      // Preserve existing migratedFrom if already set (from a previous run)
      try {
        const getCommand = new GetObjectCommand({
          Bucket: process.env.S3_BUCKET_NAME!,
          Key: userMappingKey,
        });
        const getResponse = await s3Client.send(getCommand);
        if (getResponse.Body) {
          const bodyString = await getResponse.Body.transformToString();
          const existing = JSON.parse(bodyString);
          if (existing.migratedFrom) {
            mappingData.migratedFrom = existing.migratedFrom;
            mappingData.migratedAt = existing.migratedAt;
            mappingData.objectsCopied = existing.objectsCopied;
          }
        }
      } catch {
        // No existing mapping, nothing to preserve
      }
    }

    const command = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: userMappingKey,
      Body: JSON.stringify(mappingData, null, 2),
      ContentType: 'application/json',
    });

    await s3Client.send(command);

    return NextResponse.json({
      success: true,
      message: migration.migrated
        ? `User mapping updated. Migrated ${migration.objectsCopied} objects from old account.`
        : 'User mapping updated',
      userId: user.id,
      migrated: migration.migrated,
      migratedFrom: migration.migratedFrom,
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