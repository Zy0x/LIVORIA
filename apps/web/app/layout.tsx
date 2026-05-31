import type { Metadata } from 'next';
import { DM_Mono, Plus_Jakarta_Sans } from 'next/font/google';
import './globals.css';

const jakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-jakarta',
  display: 'swap',
});

const dmMono = DM_Mono({
  subsets: ['latin'],
  weight: ['400', '500'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://livoria.web.id'),
  title: 'LIVORIA',
  description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, obat-obatan, dan catatan pribadi.',
  applicationName: 'LIVORIA',
  manifest: '/manifest.json',
  icons: {
    icon: [
      { url: '/icons/icon-512x512.png', type: 'image/png' },
      { url: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
      { url: '/icons/icon-256x256.png', sizes: '256x256', type: 'image/png' },
      { url: '/icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
    ],
    shortcut: '/icons/icon-256x256.png',
    apple: [
      { url: '/icons/icon-512x512.png', sizes: '512x512' },
      { url: '/icons/icon-256x256.png', sizes: '256x256' },
      { url: '/icons/icon-128x128.png', sizes: '128x128' },
    ],
  },
  openGraph: {
    title: 'LIVORIA',
    description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, obat-obatan, dan catatan pribadi.',
    type: 'website',
    images: ['/icons/icon-512x512.png'],
  },
  twitter: {
    card: 'summary',
    title: 'LIVORIA',
    description: 'LIVORIA - Personal archive app untuk tagihan, anime, donghua, waifu, obat-obatan, dan catatan pribadi.',
    images: ['/icons/icon-512x512.png'],
  },
};

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  themeColor: '#2d5040',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id" className={`${jakartaSans.variable} ${dmMono.variable}`}>
      <body>
        <script id="livoria-pwa-bootstrap" src="/pwa-bootstrap.js" defer />
        <noscript>
          <div
            style={{
              minHeight: '100vh',
              display: 'grid',
              placeItems: 'center',
              background: '#f6f8f4',
              color: '#1f2a24',
              padding: 24,
              fontFamily: 'system-ui, sans-serif',
              textAlign: 'center',
            }}
          >
            <main style={{ maxWidth: 380 }}>
              <h1 style={{ margin: '0 0 8px', fontSize: 22 }}>LIVORIA membutuhkan JavaScript</h1>
              <p style={{ margin: 0, color: '#66736b', lineHeight: 1.55 }}>
                Aktifkan JavaScript untuk domain ini, lalu muat ulang halaman agar aplikasi dapat berjalan.
              </p>
            </main>
          </div>
        </noscript>
        <div
          id="livoria-boot-fallback"
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 2147483647,
            display: 'grid',
            placeItems: 'center',
            background: '#f6f8f4',
            color: '#1f2a24',
            opacity: 0,
            padding: 24,
            fontFamily: 'system-ui, sans-serif',
            textAlign: 'center',
            animation: 'livoriaBootReveal 0.18s ease 1.2s forwards',
          }}
        >
          <main style={{ maxWidth: 420 }}>
            <div
              aria-hidden="true"
              style={{
                width: 42,
                height: 42,
                margin: '0 auto 14px',
                borderRadius: 999,
                border: '2px solid rgba(45, 80, 64, 0.18)',
                borderTopColor: '#2d5040',
                animation: 'livoriaBootSpin 0.9s linear infinite',
              }}
            />
            <h1 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 800 }}>Memuat LIVORIA</h1>
            <p style={{ margin: '0 0 14px', color: '#66736b', lineHeight: 1.55 }}>
              Menyiapkan aplikasi terbaru. Jika tetap tertahan, muat ulang halaman atau pastikan JavaScript
              diizinkan untuk livoria.web.id.
            </p>
            <a
              href="https://livoria.web.id/?reload=1"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 42,
                padding: '0 18px',
                borderRadius: 999,
                background: '#2d5040',
                color: '#ffffff',
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: 14,
              }}
            >
              Muat Ulang
            </a>
            <style>{`@keyframes livoriaBootReveal{to{opacity:1}}@keyframes livoriaBootSpin{to{transform:rotate(360deg)}}`}</style>
          </main>
        </div>
        {children}
      </body>
    </html>
  );
}
