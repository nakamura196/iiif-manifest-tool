import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';
import { validateApiToken } from './api-tokens';

export interface AuthUser {
  id: string;    // Firebase UID or API-token user ID
  email: string;
  name: string;
  image: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const token = authHeader.split('Bearer ')[1];

  // 1. Try Firebase ID token first
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    return {
      id: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || '',
      image: decoded.picture || '',
    };
  } catch {
    // Not a valid Firebase token; fall through to API token check
  }

  // 2. Try API token (long-lived, prefixed with pkt_)
  try {
    const userId = await validateApiToken(token);
    if (userId) {
      return {
        id: userId,
        email: '',
        name: 'API Token User',
        image: '',
      };
    }
  } catch {
    // API token validation failed
  }

  return null;
}
