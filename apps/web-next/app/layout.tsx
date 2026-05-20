import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'LIVORIA',
  description: 'Living Information & Organized Records Archive.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>{children}</body>
    </html>
  );
}
