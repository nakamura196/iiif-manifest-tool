import { NextRequest } from 'next/server';
import { adminAuth } from './firebase-admin';

export interface AuthUser {
  id: string;    // Firebase UID
  email: string;
  name: string;
  image: string;
}

export async function getAuthUser(request: NextRequest): Promise<AuthUser | null> {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;

  const idToken = authHeader.split('Bearer ')[1];
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      id: decoded.uid,
      email: decoded.email || '',
      name: decoded.name || '',
      image: decoded.picture || '',
    };
  } catch {
    return null;
  }
}
