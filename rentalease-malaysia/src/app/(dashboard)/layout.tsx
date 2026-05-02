import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import TopNav from '@/components/ui/TopNav';
import KycPendingBanner from '@/components/ui/KycPendingBanner';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  // Check verification status — not needed for ADMIN (always verified)
  let isVerified = true;
  if (session.user.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true },
    });
    isVerified = user?.isVerified ?? false;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <TopNav />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!isVerified && <KycPendingBanner role={session.user.role} />}
        {children}
      </main>
    </div>
  );
}
