'use client';

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { initLogRocket, identifyUser, addSessionTags } from '../lib/logrocket';

export default function LogRocketInit() {
  const { data: session } = useSession();

  useEffect(() => {
    // Initialize LogRocket
    initLogRocket();

    // Identify user if authenticated
    if (session?.user) {
      const userId = session.user.email || session.user.id || 'anonymous';
      const userInfo = {
        name: session.user.name || undefined,
        email: session.user.email || undefined,
      };

      identifyUser(userId, userInfo);
    }

    // Add session tags
    addSessionTags({
      environment: process.env.NODE_ENV || 'development',
      app: 'datablox',
    });
  }, [session]);

  // This component doesn't render anything
  return null;
}