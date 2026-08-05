import type { Metadata } from 'next';
import { Inter, Space_Grotesk } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/layout/Navbar';
import { Footer } from '@/components/layout/Footer';
import { Analytics } from '@vercel/analytics/next';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  variable: '--font-space-grotesk',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'StreamVault — Fast YouTube, Facebook & Instagram Video Downloader',
  description: 'Download videos from YouTube, Facebook, and Instagram in 4K, 1080p, 720p, or MP3 format with live download progress tracking. Free, fast, and secure.',
  keywords: ['video downloader', 'youtube downloader', 'facebook video downloader', 'instagram reel downloader', 'mp3 converter', '4k video downloader'],
  authors: [{ name: 'StreamVault Team' }],
  openGraph: {
    title: 'StreamVault — Fast Video Downloader',
    description: 'Download YouTube, Facebook, and Instagram videos in high quality with live progress bars.',
    type: 'website',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`dark ${inter.variable} ${spaceGrotesk.variable}`}>
      <body className="bg-slate-950 text-slate-100 min-h-screen flex flex-col font-sans">
        <Navbar />
        <main className="flex-grow">
          {children}
        </main>
        <Footer />
        <Analytics />
      </body>
    </html>
  );
}
