'use client';

import { useSession } from 'next-auth/react';
import { useEffect } from 'react';

export default function UserMappingUpdater() {
  const { data: session } = useSession();
  
  useEffect(() => {
    if (session?.user) {
      // Update user mapping when user logs in
      fetch('/api/auth/user-mapping', {
        method: 'POST',
      }).catch(error => {
        console.log('Failed to update user mapping:', error);
      });
    }
  }, [session?.user?.id]);
  
  return null;
}