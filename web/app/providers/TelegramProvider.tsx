'use client';

import { useEffect, ReactNode } from 'react';
import { useAuthStore } from '@/lib/store/auth';

declare global {
  interface Window {
    Telegram?: {
      WebApp: {
        initData: string;
        version: string;
        platform: string;
        colorScheme: 'light' | 'dark';
        themeParams: {
          bg_color?: string;
          text_color?: string;
        };
        BackButton: {
          show: () => void;
          hide: () => void;
          onClick: (callback: () => void) => void;
        };
        ready: () => void;
        expand: () => void;
      };
    };
  }
}

export function TelegramProvider({ children }: { children: ReactNode }) {
  const { authenticateTelegram } = useAuthStore();

  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      const tg = window.Telegram.WebApp;
      tg.ready();
      tg.expand();

      if (tg.initData) {
        authenticateTelegram(tg.initData);
      }

      const backButton = tg.BackButton;
      backButton.onClick(() => {
        window.history.back();
      });

      if (window.history.length > 1) {
        backButton.show();
      } else {
        backButton.hide();
      }
    }
  }, [authenticateTelegram]);

  return <>{children}</>;
}
