import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Jarvis', description: 'Sua aliança inteligente', manifest: '/manifest.json',
  appleWebApp: { capable: true, statusBarStyle: 'black-translucent', title: 'Jarvis' },
};

export const viewport: Viewport = {
  width: 'device-width', initialScale: 1, maximumScale: 1, userScalable: false, themeColor: '#0a0a0a',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <head><link rel="apple-touch-icon" href="/icon-192.png"/><meta name="mobile-web-app-capable" content="yes"/></head>
      <body>{children}</body>
    </html>
  );
}
