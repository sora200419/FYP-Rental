import type { Metadata } from 'next';
import './globals.css';
import AuthSessionProvider from '@/components/providers/SessionProvider';

export const metadata: Metadata = {
  title: 'RentalEase Malaysia',
  description:
    'AI-Assisted Digital Tenancy Agreement Platform for Malaysian Residential Rentals',
};

// The admin account is created at build time by scripts/bootstrap-admin.ts,
// not here — the root layout runs on every request.
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <AuthSessionProvider>{children}</AuthSessionProvider>
      </body>
    </html>
  );
}
