import { S3Client, GetObjectCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { randomBytes, createHash } from 'crypto';

const s3Client = new S3Client({
  endpoint: process.env.S3_ENDPOINT,
  region: process.env.S3_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID!,
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY!,
  },
  forcePathStyle: true,
});

export interface ApiToken {
  /** SHA-256 hash of the token (stored, never the raw token) */
  tokenHash: string;
  /** Human-readable name for the token */
  name: string;
  /** Last 4 characters of the raw token for identification */
  lastFour: string;
  /** ISO 8601 creation timestamp */
  createdAt: string;
  /** ISO 8601 expiration timestamp, or null for no expiry */
  expiresAt: string | null;
  /** ISO 8601 timestamp of last use, or null if never used */
  lastUsedAt: string | null;
}

export interface ApiTokenStore {
  tokens: ApiToken[];
}

function getTokenStoreKey(userId: string): string {
  return `users/${userId}/api-tokens.json`;
}

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

async function getTokenStore(userId: string): Promise<ApiTokenStore> {
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: getTokenStoreKey(userId),
    });
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    if (body) {
      return JSON.parse(body);
    }
  } catch {
    // File doesn't exist yet
  }
  return { tokens: [] };
}

async function saveTokenStore(userId: string, store: ApiTokenStore): Promise<void> {
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: getTokenStoreKey(userId),
    Body: JSON.stringify(store, null, 2),
    ContentType: 'application/json',
  });
  await s3Client.send(command);
}

/**
 * Generate a new API token for a user.
 * Returns the raw token (only shown once) and the stored metadata.
 */
export async function generateApiToken(
  userId: string,
  name: string,
  expiresInDays?: number
): Promise<{ rawToken: string; token: ApiToken }> {
  const rawToken = `pkt_${randomBytes(32).toString('hex')}`;
  const tokenHash = hashToken(rawToken);
  const lastFour = rawToken.slice(-4);

  const token: ApiToken = {
    tokenHash,
    name,
    lastFour,
    createdAt: new Date().toISOString(),
    expiresAt: expiresInDays
      ? new Date(Date.now() + expiresInDays * 86400000).toISOString()
      : null,
    lastUsedAt: null,
  };

  const store = await getTokenStore(userId);
  store.tokens.push(token);
  await saveTokenStore(userId, store);

  return { rawToken, token };
}

/**
 * List all API tokens for a user (without the raw token values).
 */
export async function listApiTokens(userId: string): Promise<ApiToken[]> {
  const store = await getTokenStore(userId);
  // Filter out expired tokens
  const now = new Date().toISOString();
  return store.tokens.filter(
    (t) => !t.expiresAt || t.expiresAt > now
  );
}

/**
 * Revoke (delete) an API token by its hash.
 */
export async function revokeApiToken(userId: string, tokenHash: string): Promise<boolean> {
  const store = await getTokenStore(userId);
  const idx = store.tokens.findIndex((t) => t.tokenHash === tokenHash);
  if (idx === -1) return false;
  store.tokens.splice(idx, 1);
  await saveTokenStore(userId, store);
  return true;
}

/**
 * Validate a raw API token.
 * Returns the userId if valid, null otherwise.
 * Also updates lastUsedAt on the token.
 */
export async function validateApiToken(rawToken: string): Promise<string | null> {
  // API tokens start with 'pkt_' prefix
  if (!rawToken.startsWith('pkt_')) return null;

  const tokenHash = hashToken(rawToken);

  // Check the global token index (hash -> userId)
  try {
    const indexCommand = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: 'api-tokens/index.json',
    });
    const indexResponse = await s3Client.send(indexCommand);
    const indexBody = await indexResponse.Body?.transformToString();
    if (indexBody) {
      const index: Record<string, string> = JSON.parse(indexBody);
      const userId = index[tokenHash];
      if (userId) {
        // Verify the token still exists and is not expired
        const store = await getTokenStore(userId);
        const token = store.tokens.find((t) => t.tokenHash === tokenHash);
        if (token) {
          if (token.expiresAt && token.expiresAt < new Date().toISOString()) {
            return null; // Expired
          }
          // Update lastUsedAt
          token.lastUsedAt = new Date().toISOString();
          await saveTokenStore(userId, store);
          return userId;
        }
      }
    }
  } catch {
    // Index doesn't exist yet
  }

  return null;
}

/**
 * Update the global token index (hash -> userId mapping).
 * Called after generating or revoking tokens.
 */
export async function updateTokenIndex(userId: string): Promise<void> {
  // Load current index
  let index: Record<string, string> = {};
  try {
    const command = new GetObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME!,
      Key: 'api-tokens/index.json',
    });
    const response = await s3Client.send(command);
    const body = await response.Body?.transformToString();
    if (body) {
      index = JSON.parse(body);
    }
  } catch {
    // Index doesn't exist yet
  }

  // Remove old entries for this user
  for (const [hash, uid] of Object.entries(index)) {
    if (uid === userId) {
      delete index[hash];
    }
  }

  // Add current tokens
  const store = await getTokenStore(userId);
  for (const token of store.tokens) {
    index[token.tokenHash] = userId;
  }

  // Save index
  const command = new PutObjectCommand({
    Bucket: process.env.S3_BUCKET_NAME!,
    Key: 'api-tokens/index.json',
    Body: JSON.stringify(index, null, 2),
    ContentType: 'application/json',
  });
  await s3Client.send(command);
}
