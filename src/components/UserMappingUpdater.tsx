'use client';

import { useAuth } from '@/components/providers/FirebaseAuthProvider';
import { apiFetch } from '@/lib/api-client';
import { useEffect } from 'react';

export default function UserMappingUpdater() {
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      // Update user mapping when user logs in
      apiFetch('/api/auth/user-mapping', {
        method: 'POST',
      }).catch(error => {
        console.log('Failed to update user mapping:', error);
      });
    }
  }, [user]);

  return null;
}
