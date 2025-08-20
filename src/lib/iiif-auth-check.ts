import { getServerSession } from 'next-auth';
import { authOptions } from './auth';
import { getIIIFCollection } from './iiif-collection';

export async function checkCollectionAccess(
  userId: string,
  collectionId: string,
  requestUserId?: string | null
): Promise<boolean> {
  try {
    const collection = await getIIIFCollection(userId, collectionId);
    if (!collection) return false;

    const accessInfo = collection['x-access'];
    if (!accessInfo) return true; // No access control means public

    // Public collections are accessible to everyone
    if (accessInfo.isPublic) return true;

    // Owner always has access
    if (requestUserId === accessInfo.owner) return true;

    // Check if user is in allowed users list
    if (requestUserId && accessInfo.allowedUsers?.includes(requestUserId)) {
      return true;
    }

    // In the future, can add group-based access here
    // if (requestUserId && checkUserGroups(requestUserId, accessInfo.allowedGroups)) {
    //   return true;
    // }

    return false;
  } catch (error) {
    console.error('Error checking collection access:', error);
    return false;
  }
}

interface CollectionWithAccess {
  isPublic: boolean;
  'x-access'?: {
    owner?: string;
    allowedUsers?: string[];
  };
}

export async function filterAccessibleCollections(
  collections: CollectionWithAccess[],
  requestUserId?: string | null
): Promise<CollectionWithAccess[]> {
  if (!requestUserId) {
    // Unauthenticated users can only see public collections
    return collections.filter(col => col.isPublic);
  }

  // Authenticated users can see:
  // 1. Their own collections (public and private)
  // 2. Public collections from others
  // 3. Collections they have been granted access to
  return collections.filter(col => {
    // Owner can see all their collections
    if (col['x-access']?.owner === requestUserId) return true;
    
    // Public collections are visible to all
    if (col.isPublic) return true;
    
    // Check if user has been granted access
    if (col['x-access']?.allowedUsers?.includes(requestUserId)) return true;
    
    return false;
  });
}

// Middleware function to check access in API routes
export async function requireCollectionAccess(
  userId: string,
  collectionId: string
): Promise<{ allowed: boolean; error?: string }> {
  const session = await getServerSession(authOptions);
  
  const collection = await getIIIFCollection(userId, collectionId);
  if (!collection) {
    return { allowed: false, error: 'Collection not found' };
  }

  const accessInfo = collection['x-access'];
  
  // Public collections don't require authentication
  if (accessInfo?.isPublic) {
    return { allowed: true };
  }

  // Private collections require authentication
  if (!session?.user?.id) {
    return { allowed: false, error: 'Authentication required' };
  }

  // Check if user has access
  const hasAccess = await checkCollectionAccess(userId, collectionId, session.user.id);
  
  if (!hasAccess) {
    return { allowed: false, error: 'Access denied' };
  }

  return { allowed: true };
}