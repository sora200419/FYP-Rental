import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

const STATUS_STYLES: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-700',
  ACTIVE: 'bg-green-100 text-green-700',
  EXPIRED: 'bg-gray-100 text-gray-500',
  TERMINATED: 'bg-red-100 text-red-600',
};

export default async function LandlordTenanciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const tenancies = await prisma.tenancy.findMany({
    where: {
      property: { landlordId: session.user.id },
    },
    include: {
      property: {
        select: { address: true, city: true, state: true },
      },
      tenant: {
        select: { name: true, email: true },
      },
      agreement: {
        select: { status: true },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>
          <p className="text-gray-500 mt-1 text-sm">
            {tenancies.length}{' '}
            {tenancies.length === 1 ? 'tenancy' : 'tenancies'} across all
            properties
          </p>
        </div>
        <Link
          href="/dashboard/landlord/tenancies/new"
          className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
        >
          + New Tenancy
        </Link>
      </div>

      {tenancies.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
          <p className="text-4xl mb-4">📋</p>
          <p className="text-gray-700 font-semibold text-lg">
            No tenancies yet
          </p>
          <p className="text-gray-400 text-sm mt-1 mb-6">
            Add a tenant to one of your properties to get started.
          </p>
          <Link
            href="/dashboard/landlord/properties"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-6 py-3 rounded-lg transition-colors"
          >
            Go to Properties
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {tenancies.map((tenancy) => {
            const start = new Date(tenancy.startDate).toLocaleDateString(
              'en-MY',
              { day: 'numeric', month: 'short', year: 'numeric' },
            );
            const end = new Date(tenancy.endDate).toLocaleDateString('en-MY', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            });

            return (
              <div
                key={tenancy.id}
                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-900 text-sm truncate">
                      {tenancy.property.address}
                    </p>
                    <p className="text-gray-400 text-xs mt-0.5">
                      {tenancy.property.city}, {tenancy.property.state}
                    </p>

                    <div className="flex items-center gap-2 mt-3">
                      <div className="w-6 h-6 rounded-full bg-blue-100 flex items-center justify-center text-xs font-bold text-blue-600">
                        {tenancy.tenant.name.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-700">
                          {tenancy.tenant.name}
                        </p>
                        <p className="text-xs text-gray-400">
                          {tenancy.tenant.email}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-3 text-xs text-gray-500">
                      <span>
                        📅 {start} → {end}
                      </span>
                      <span>
                        💰 RM {Number(tenancy.monthlyRent).toLocaleString()}/mo
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <span
                      className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                        STATUS_STYLES[tenancy.status] ??
                        'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {tenancy.status.charAt(0) +
                        tenancy.status.slice(1).toLowerCase()}
                    </span>

                    {tenancy.agreement ? (
                      <span className="text-xs text-gray-400">
                        Agreement:{' '}
                        <span className="font-medium text-gray-600">
                          {tenancy.agreement.status.charAt(0) +
                            tenancy.agreement.status.slice(1).toLowerCase()}
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs text-amber-600 font-medium">
                        No agreement yet
                      </span>
                    )}

                    <Link
                      href={`/dashboard/landlord/tenancies/${tenancy.id}`}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
