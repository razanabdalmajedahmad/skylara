import type { Metadata } from 'next';
import { ReactNode } from 'react';
import Providers from './providers';
import './globals.css';

export const metadata: Metadata = {
  title: 'SkyLara - Skydiving DZ Management',
  description: 'Complete manifest, safety, and athlete management for drop zones',
  viewport: 'width=device-width, initial-scale=1',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'SkyLara',
  },
  manifest: '/manifest.json',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <meta name="theme-color" content="#1b4f72" />
        <meta name="apple-mobile-web-app-capable" content="true" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="SkyLara" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
