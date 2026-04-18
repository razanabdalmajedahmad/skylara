'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function Home() {
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    } else {
      router.push('/login');
    }
  }, [user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-navy">
      <div className="text-center text-white">
        <h1 className="text-3xl font-bold mb-4">SkyLara</h1>
        <p className="text-lg">Loading...</p>
      </div>
    </div>
  );
}
