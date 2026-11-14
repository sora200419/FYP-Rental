import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import KycPendingBanner from '@/components/ui/KycPendingBanner';
import DashboardShell from '@/components/ui/DashboardShell';
import { LanguageProvider } from '@/components/providers/LanguageProvider';
import { toLanguage } from '@/lib/i18n';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  let isVerified = true;
  let kycState: 'none' | 'PENDING' | 'REJECTED' = 'none';
  let rejectedReason: string | null = null;

  if (session.user.role !== 'ADMIN') {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        isVerified: true,
        kycSubmission: { select: { status: true, rejectedReason: true } },
      },
    });
    isVerified = user?.isVerified ?? false;
    const sub = user?.kycSubmission;
    if (sub?.status === 'PENDING') kycState = 'PENDING';
    else if (sub?.status === 'REJECTED') { kycState = 'REJECTED'; rejectedReason = sub.rejectedReason ?? null; }
  }

  const lang = toLanguage(session.user.language);

  return (
    <LanguageProvider lang={lang}>
      <div lang={lang === 'ms' ? 'ms' : 'en'} className="contents">
        <DashboardShell>
          {!isVerified && (
            <KycPendingBanner
              role={session.user.role}
              kycState={kycState}
              rejectedReason={rejectedReason}
              lang={lang}
            />
          )}
          {children}
        </DashboardShell>
      </div>
    </LanguageProvider>
  );
}
