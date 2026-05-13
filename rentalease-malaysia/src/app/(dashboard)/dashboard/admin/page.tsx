import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { AttentionHero, PageHeader, StatCard } from '@/components/ui/RedesignPrimitives';
import { getDashboardAttention } from '@/lib/uiRedesign';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const [totalUsers, unverifiedCount, totalProperties, unverifiedPropertiesCount] =
    await Promise.all([
      prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
      prisma.user.count({ where: { isVerified: false, role: { not: 'ADMIN' } } }),
      prisma.property.count(),
      prisma.property.count({ where: { isVerified: false } }),
    ]);

  const attention = getDashboardAttention({
    role: 'ADMIN',
    pendingKyc: unverifiedCount,
    pendingProperties: unverifiedPropertiesCount,
  });
  const attentionHref = unverifiedCount > 0 ? '/dashboard/admin/verify' : '/dashboard/admin/properties';

  return (
    <div>
      <PageHeader
        eyebrow="Admin verification center"
        title="Admin Dashboard"
        description="Review the queues that block platform activity and listing readiness."
      />

      <AttentionHero
        title={attention.title}
        description={attention.description}
        actionLabel={attention.actionLabel}
        href={attentionHref}
        secondary={
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-700">Blocking queues</p>
            <QueueLine label="Pending KYC" value={unverifiedCount} />
            <QueueLine label="Pending properties" value={unverifiedPropertiesCount} />
          </div>
        }
      />

      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard label="Total users" value={totalUsers} />
        <StatCard label="Pending KYC" value={unverifiedCount} tone={unverifiedCount > 0 ? 'amber' : 'default'} />
        <StatCard label="Properties" value={totalProperties} tone="blue" />
        <StatCard
          label="Pending properties"
          value={unverifiedPropertiesCount}
          tone={unverifiedPropertiesCount > 0 ? 'amber' : 'default'}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <ReviewCard
          href="/dashboard/admin/verify"
          title="KYC Verification Queue"
          description="Review pending identity documents and approve users."
          count={unverifiedCount}
        />
        <ReviewCard
          href="/dashboard/admin/properties"
          title="Property Verification Queue"
          description="Review and approve new property listings before tenants can be invited."
          count={unverifiedPropertiesCount}
        />
      </div>
    </div>
  );
}

function QueueLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white px-3 py-2 text-sm">
      <span className="font-medium text-gray-700">{label}</span>
      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${value > 0 ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-500'}`}>
        {value}
      </span>
    </div>
  );
}

function ReviewCard({
  href,
  title,
  description,
  count,
}: {
  href: string;
  title: string;
  description: string;
  count: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-5 py-4 transition-colors hover:border-gray-300"
    >
      <div>
        <p className="text-sm font-semibold text-gray-900">{title}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-gray-500">{description}</p>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${count > 0 ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200 ring-inset' : 'bg-gray-100 text-gray-500'}`}>
          {count}
        </span>
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
    </Link>
  );
}
