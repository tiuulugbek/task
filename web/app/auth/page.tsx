'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store/auth';

export default function AuthPage() {
  const router = useRouter();
  const { user, loading, authenticateTelegram, fetchUser } = useAuthStore();

  useEffect(() => {
    if (user) {
      router.push('/dashboard');
    }
  }, [user, router]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp?.initData) {
      authenticateTelegram(window.Telegram.WebApp.initData);
    } else {
      fetchUser();
    }
  }, [authenticateTelegram, fetchUser]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="bg-white rounded-2xl shadow-soft p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-center mb-6">Acoustic Task Manager</h1>
        <p className="text-gray-600 text-center mb-8">
          Please open this app through Telegram to continue.
        </p>
        <div className="text-center">
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_BOT_NAME || 'your_bot'}`}
            className="btn-primary inline-block"
          >
            Open in Telegram
          </a>
        </div>
      </div>
    </div>
  );
}
