import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import AuthSessionProvider from '@/components/providers/SessionProvider';

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'RentalEase Malaysia',
  description:
    'AI-Assisted Digital Tenancy Agreement Platform for Malaysian Residential Rentals',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
