/**
 * Centralized IIIF ID handling utilities.
 *
 * Manifest IDs in this system use a combined format: `{userId}_{collectionId}_{itemId}`
 * This module provides helpers to build, parse, and normalize these IDs consistently.
 */

// ---------------------------------------------------------------------------
// Combined ID helpers
// ---------------------------------------------------------------------------

/** Build a combined manifest ID from its parts. */
export function buildCombinedId(userId: string, collectionId: string, itemId: string): string {
  return `${userId}_${collectionId}_${itemId}`;
}

/** Parse a combined ID into its parts. Returns null if the format is invalid. */
export function parseCombinedId(combinedId: string): { userId: string; collectionId: string; itemId: string } | null {
  // The combined format is userId_collectionId_itemId
  // userId and collectionId may themselves contain hyphens (UUIDs) but not underscores
  const firstUnderscore = combinedId.indexOf('_');
  if (firstUnderscore === -1) return null;

  const secondUnderscore = combinedId.indexOf('_', firstUnderscore + 1);
  if (secondUnderscore === -1) return null;

  return {
    userId: combinedId.slice(0, firstUnderscore),
    collectionId: combinedId.slice(firstUnderscore + 1, secondUnderscore),
    itemId: combinedId.slice(secondUnderscore + 1),
  };
}

// ---------------------------------------------------------------------------
// Extract item-only ID from various stored formats
// ---------------------------------------------------------------------------

/**
 * Extract the item-only ID from a manifestId or URL that may already contain
 * the userId_collectionId prefix.
 */
export function extractItemId(
  value: string,
  userId: string,
  collectionId: string
): string {
  const prefix = `${userId}_${collectionId}_`;

  // If the value starts with the prefix, strip it
  if (value.startsWith(prefix)) {
    return value.slice(prefix.length);
  }

  return value;
}

/**
 * Extract the item-only ID from an item reference (as stored in collection.json).
 *
 * Handles these formats:
 *   - item.manifestId (may be itemId or userId_collectionId_itemId)
 *   - .../items/{itemId}/manifest(.json)          (S3 path)
 *   - .../api/iiif/3/{combinedId}/manifest        (API URL)
 *   - .../api/iiif/{combinedId}/manifest           (API URL without version)
 */
export function extractItemIdFromReference(
  item: { id?: string; manifestId?: string },
  userId: string,
  collectionId: string
): string {
  // 1. Try manifestId first
  if (item.manifestId) {
    return extractItemId(item.manifestId, userId, collectionId);
  }

  if (!item.id) return '';

  // 2. S3 path: .../items/{itemId}/manifest
  const s3Match = item.id.match(/\/items\/([^/]+)\/manifest/);
  if (s3Match) {
    return extractItemId(s3Match[1], userId, collectionId);
  }

  // 3a. RESTful API URL: .../api/iiif/{version}/users/{userId}/collections/{collectionId}/items/{itemId}/manifest
  const restfulMatch = item.id.match(/\/api\/iiif\/\d+\/users\/[^/]+\/collections\/[^/]+\/items\/([^/]+)\/manifest/);
  if (restfulMatch) {
    return restfulMatch[1];
  }

  // 3b. Legacy API URL: .../api/iiif/(3/)?{combinedId}/manifest
  const apiMatch = item.id.match(/\/api\/iiif\/(?:3\/)?([^/]+)\/manifest/);
  if (apiMatch) {
    return extractItemId(apiMatch[1], userId, collectionId);
  }

  // 4. Fallback: last non-manifest segment
  const segments = item.id
    .split('/')
    .filter((s: string) => s && s !== 'manifest' && s !== 'manifest.json');
  const last = segments.pop() || item.id;
  return extractItemId(last, userId, collectionId);
}

// ---------------------------------------------------------------------------
// Manifest URL builder
// ---------------------------------------------------------------------------

/** Build a public IIIF v3 manifest URL (RESTful format). */
export function buildManifestUrl(
  baseUrl: string,
  userId: string,
  collectionId: string,
  itemId: string,
  version: 2 | 3 = 3
): string {
  return `${baseUrl}/api/iiif/${version}/users/${userId}/collections/${collectionId}/items/${itemId}/manifest`;
}

/** Build a public IIIF collection URL (RESTful format). */
export function buildCollectionUrl(
  baseUrl: string,
  userId: string,
  collectionId: string,
  version: 2 | 3 = 3
): string {
  return `${baseUrl}/api/iiif/${version}/users/${userId}/collections/${collectionId}`;
}

/** Parse a RESTful manifest URL into its parts. Returns null if the format is invalid. */
export function parseManifestUrl(url: string): { userId: string; collectionId: string; itemId: string; version: number } | null {
  const match = url.match(/\/api\/iiif\/(\d+)\/users\/([^/]+)\/collections\/([^/]+)\/items\/([^/]+)\/manifest/);
  if (!match) return null;
  return {
    version: parseInt(match[1], 10),
    userId: match[2],
    collectionId: match[3],
    itemId: match[4],
  };
}

// ---------------------------------------------------------------------------
// Normalize collection items for IIIF response
// ---------------------------------------------------------------------------

interface RawCollectionItem {
  id?: string;
  manifestId?: string;
  type?: string;
  label?: Record<string, string[]>;
  summary?: Record<string, string[]>;
  thumbnail?: unknown;
  [key: string]: unknown;
}

interface NormalizedCollectionItem {
  id: string;
  type: string;
  label: Record<string, string[]>;
  summary?: Record<string, string[]>;
  thumbnail?: unknown;
}

/**
 * Normalize collection items for the IIIF Collection API response.
 * Deduplicates IDs and builds correct manifest URLs.
 */
export function normalizeCollectionItems(
  items: RawCollectionItem[],
  userId: string,
  collectionId: string,
  baseUrl: string
): NormalizedCollectionItem[] {
  return items.map((item) => {
    const itemId = extractItemIdFromReference(item, userId, collectionId);
    const result: NormalizedCollectionItem = {
      id: buildManifestUrl(baseUrl, userId, collectionId, itemId),
      type: 'Manifest',
      label: item.label || {},
    };

    if (item.summary) {
      result.summary = item.summary as Record<string, string[]>;
    }
    if (item.thumbnail) {
      result.thumbnail = item.thumbnail;
    }

    return result;
  });
}
