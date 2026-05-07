import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KycPendingBanner from '@/components/ui/KycPendingBanner';
import DashboardShell from '@/components/ui/DashboardShell';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  let isVerified = true;
  if (session.user.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isVerified: true },
    });
    isVerified = user?.isVerified ?? false;
  }

  return (
    <DashboardShell>
      {!isVerified && <KycPendingBanner role={session.user.role} />}
      {children}
    </DashboardShell>
  );
}
