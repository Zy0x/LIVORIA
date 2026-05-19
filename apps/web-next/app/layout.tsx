import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIVORIA Next Preview',
  description: 'Hybrid Next.js preview shell for LIVORIA.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
