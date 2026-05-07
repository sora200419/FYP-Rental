import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  INVITED:    `${PILL_BASE} bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset`,
  PENDING:    `${PILL_BASE} bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`,
  ACTIVE:     `${PILL_BASE} bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`,
  EXPIRED:    `${PILL_BASE} bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`,
  TERMINATED: `${PILL_BASE} bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`,
};

export default async function LandlordTenanciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const tenancies = await prisma.tenancy.findMany({
    where: { room: { property: { landlordId: session.user.id } } },
    include: {
      room: {
        include: {
          property: { select: { address: true, city: true, state: true } },
        },
      },
      tenant: { select: { name: true, email: true } },
      agreement: { select: { status: true } },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>
          <p className="text-sm text-gray-500 mt-1">
            {tenancies.length} {tenancies.length === 1 ? 'tenancy' : 'tenancies'} across all properties
          </p>
        </div>
        <Link
          href="/dashboard/landlord/properties"
          className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          New Tenancy
        </Link>
      </div>

      {tenancies.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <div className="w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center mx-auto mb-4">
            <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <p className="text-gray-700 font-semibold text-base">No tenancies yet</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">
            Go to a property, add rooms, then create a tenancy from a vacant room.
          </p>
          <Link
            href="/dashboard/landlord/properties"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg transition-colors"
          >
            Go to Properties
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {tenancies.map((tenancy) => {
            const start = new Date(tenancy.startDate).toLocaleDateString('en-MY', {
              day: 'numeric', month: 'short', year: 'numeric',
            });
            const end = new Date(tenancy.endDate).toLocaleDateString('en-MY', {
              day: 'numeric', month: 'short', year: 'numeric',
            });

            return (
              <div key={tenancy.id} className="flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {tenancy.room.property.address}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {tenancy.room.property.city}, {tenancy.room.property.state}
                    {' · '}
                    <span className="text-gray-500 font-medium">{tenancy.room.label}</span>
                  </p>
                  <p className="text-xs text-gray-600 mt-1">{tenancy.tenant.name}</p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {start} — {end}
                    {' · '}
                    RM {Number(tenancy.monthlyRent).toLocaleString()}/mo
                  </p>
                </div>
                <div className="flex flex-col items-end gap-2 ml-4 shrink-0">
                  <span className={STATUS_PILL[tenancy.status] ?? `${PILL_BASE} bg-gray-100 text-gray-500`}>
                    {tenancy.status.charAt(0) + tenancy.status.slice(1).toLowerCase()}
                  </span>
                  {tenancy.agreement ? (
                    <span className="text-xs text-gray-400">
                      Agreement:{' '}
                      <span className="font-medium text-gray-600">
                        {tenancy.agreement.status.replace(/_/g, ' ')}
                      </span>
                    </span>
                  ) : (
                    <span className="text-xs text-amber-600 font-medium">No agreement yet</span>
                  )}
                  <Link
                    href={`/dashboard/landlord/tenancies/${tenancy.id}`}
                    className="text-xs text-blue-600 hover:underline font-medium"
                  >
                    View
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
