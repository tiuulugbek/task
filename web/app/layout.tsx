import './globals.css';
import { Inter } from 'next/font/google';
import { Toaster } from 'react-hot-toast';
import { TelegramProvider } from './providers/TelegramProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Acoustic Task Manager',
  description: 'Production-ready task management system',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <TelegramProvider>
          {children}
          <Toaster position="top-right" />
        </TelegramProvider>
      </body>
    </html>
  );
}
