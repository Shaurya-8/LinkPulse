import type { Metadata } from 'next';
import { Inter, JetBrains_Mono } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: {
    default: 'LinkPulse — Professional URL Shortener',
    template: '%s | LinkPulse',
  },
  description:
    'Shorten, brand, and track your links with powerful analytics, QR codes, and advanced routing rules.',
  keywords: ['url shortener', 'link shortener', 'link management', 'analytics', 'qr code'],
  authors: [{ name: 'LinkPulse' }],
  openGraph: {
    type: 'website',
    locale: 'en_US',
    siteName: 'LinkPulse',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${inter.variable} ${jetbrainsMono.variable}`}>
      <body className="min-h-screen bg-background font-sans antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
