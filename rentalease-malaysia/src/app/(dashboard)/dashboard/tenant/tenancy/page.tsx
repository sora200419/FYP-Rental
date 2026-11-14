// All of the tenant's tenancies. With exactly one, goes straight to it; with
// several (e.g. a renewal offer next to the live tenancy) lists them.
import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader } from '@/components/ui/RedesignPrimitives';
import { localeFor, statusLabel, t, toLanguage } from '@/lib/i18n';

const STATUS_ORDER = ['ACTIVE', 'PENDING', 'INVITED', 'EXPIRED', 'TERMINATED'] as const;

const STATUS_STYLE: Record<string, string> = {
  INVITED: 'bg-[rgba(196,154,60,0.12)] text-[#E8B84B]',
  PENDING: 'bg-[rgba(196,154,60,0.12)] text-[#C49A3C]',
  ACTIVE: 'bg-[rgba(74,222,128,0.12)] text-[#4ade80]',
  EXPIRED: 'bg-white/5 text-white/50',
  TERMINATED: 'bg-[rgba(248,113,113,0.1)] text-[#f87171]',
};

export default async function TenantTenanciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TENANT') redirect('/login');
  const lang = toLanguage(session.user.language);

  const tenancies = await prisma.tenancy.findMany({
    where: { tenantId: session.user.id },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      status: true,
      startDate: true,
      endDate: true,
      renewalOfTenancyId: true,
      room: { select: { label: true, property: { select: { address: true, city: true } } } },
    },
  });

  if (tenancies.length === 1) redirect(`/dashboard/tenant/tenancy/${tenancies[0].id}`);

  const sorted = [...tenancies].sort(
    (a, b) =>
      STATUS_ORDER.indexOf(a.status as (typeof STATUS_ORDER)[number]) -
      STATUS_ORDER.indexOf(b.status as (typeof STATUS_ORDER)[number]),
  );

  const formatDate = (date: Date) =>
    new Date(date).toLocaleDateString(localeFor(lang), {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Kuala_Lumpur',
    });

  return (
    <div className="max-w-3xl">
      <PageHeader
        eyebrow={t('my_tenancies_title', lang)}
        title={t('my_tenancies_title', lang)}
        description={t('my_tenancies_desc', lang)}
      />

      {sorted.length === 0 ? (
        <div className="text-center py-20 bg-[#1C2740] rounded-xl border border-[rgba(196,154,60,0.15)]">
          <p className="text-white/70 font-semibold text-lg">{t('no_tenancy_title', lang)}</p>
          <p className="text-white/40 text-sm mt-1 max-w-sm mx-auto">{t('no_tenancy_desc', lang)}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {sorted.map((tenancy) => {
            return (
              <Link
                key={tenancy.id}
                href={`/dashboard/tenant/tenancy/${tenancy.id}`}
                className="block rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-5 transition-colors hover:border-[rgba(196,154,60,0.4)]"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">{tenancy.room.property.address}</p>
                    <p className="mt-0.5 text-xs text-white/50">
                      {tenancy.room.label} · {tenancy.room.property.city}
                    </p>
                    <p className="mt-2 text-xs text-white/40">
                      {formatDate(tenancy.startDate)} – {formatDate(tenancy.endDate)}
                      {tenancy.renewalOfTenancyId ? ` · ${t('renewal_label', lang)}` : ''}
                    </p>
                  </div>
                  <span
                    className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-semibold ${STATUS_STYLE[tenancy.status] ?? STATUS_STYLE.EXPIRED}`}
                  >
                    {statusLabel('tenancy', tenancy.status, lang)}
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
