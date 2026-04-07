import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const { id } = await params;

  // Fetch the property — verify it belongs to this landlord
  const property = await prisma.property.findFirst({
    where: {
      id,
      landlordId: session.user.id,
    },
    include: {
      // Include tenancies so we can show occupancy history
      tenancies: {
        include: {
          tenant: { select: { name: true, email: true, phone: true } },
          agreement: { select: { status: true } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // If the property doesn't exist or belongs to someone else, show 404
  if (!property) notFound();

  const formatRM = (amount: unknown) =>
    `RM ${Number(amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}`;

  const activeTenancy = property.tenancies.find((t) => t.status === 'ACTIVE');
  const pendingTenancy = property.tenancies.find((t) => t.status === 'PENDING');
  const currentTenancy = activeTenancy ?? pendingTenancy ?? null;
  const isOccupied = !!activeTenancy;

  return (
    <div className="max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link
          href="/dashboard/landlord/properties"
          className="hover:text-blue-600 transition-colors"
        >
          Properties
        </Link>
        <span>/</span>
        <span className="text-gray-700 font-medium truncate">
          {property.address}
        </span>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {property.address}
          </h1>
          <p className="text-gray-500 text-sm mt-1">
            {property.city}, {property.state} {property.postcode}
          </p>
        </div>
        <span
          className={`text-sm font-semibold px-3 py-1.5 rounded-full ${
            isOccupied
              ? 'bg-green-100 text-green-700'
              : 'bg-gray-100 text-gray-500'
          }`}
        >
          {isOccupied ? 'Occupied' : 'Vacant'}
        </span>
      </div>

      <div className="space-y-5">
        {/* Property details card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Property Details
          </h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-400">Type</p>
              <p className="font-medium text-gray-900 mt-0.5">
                {property.type}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Monthly Rent</p>
              <p className="font-medium text-blue-600 mt-0.5 text-lg font-bold">
                {formatRM(property.rentAmount)}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Bedrooms</p>
              <p className="font-medium text-gray-900 mt-0.5">
                🛏 {property.bedrooms}
              </p>
            </div>
            <div>
              <p className="text-gray-400">Bathrooms</p>
              <p className="font-medium text-gray-900 mt-0.5">
                🚿 {property.bathrooms}
              </p>
            </div>
            {property.description && (
              <div className="col-span-2">
                <p className="text-gray-400">Description</p>
                <p className="font-medium text-gray-900 mt-0.5">
                  {property.description}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Current tenancy card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
            Current Tenancy
          </h2>

          {currentTenancy ? (
            <div>
              {/* Tenant info */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-sm font-bold text-blue-600">
                  {currentTenancy.tenant.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-gray-900">
                    {currentTenancy.tenant.name}
                  </p>
                  <p className="text-sm text-gray-400">
                    {currentTenancy.tenant.email}
                  </p>
                  {currentTenancy.tenant.phone && (
                    <p className="text-sm text-gray-400">
                      {currentTenancy.tenant.phone}
                    </p>
                  )}
                </div>
              </div>

              {/* Tenancy meta */}
              <div className="grid grid-cols-2 gap-3 text-sm mb-4">
                <div>
                  <p className="text-gray-400">Status</p>
                  <span
                    className={`inline-block mt-0.5 text-xs font-semibold px-2.5 py-1 rounded-full ${
                      currentTenancy.status === 'ACTIVE'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-amber-100 text-amber-700'
                    }`}
                  >
                    {currentTenancy.status.charAt(0) +
                      currentTenancy.status.slice(1).toLowerCase()}
                  </span>
                </div>
                <div>
                  <p className="text-gray-400">Agreement</p>
                  <p className="font-medium text-gray-900 mt-0.5">
                    {currentTenancy.agreement
                      ? currentTenancy.agreement.status.charAt(0) +
                        currentTenancy.agreement.status.slice(1).toLowerCase()
                      : 'Not generated'}
                  </p>
                </div>
              </div>

              <Link
                href={`/dashboard/landlord/tenancies/${currentTenancy.id}`}
                className="inline-block bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                View Tenancy Details →
              </Link>
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-3xl mb-3">🏠</p>
              <p className="text-gray-700 font-semibold">No active tenancy</p>
              <p className="text-gray-400 text-sm mt-1 mb-5">
                This property is currently vacant. Add a tenant to get started.
              </p>
              <Link
                href={`/dashboard/landlord/tenancies/new?propertyId=${property.id}`}
                className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors"
              >
                Add Tenant
              </Link>
            </div>
          )}
        </div>

        {/* Tenancy history card — shows all past tenancies */}
        {property.tenancies.length > 1 && (
          <div className="bg-white rounded-xl border border-gray-200 p-6">
            <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">
              Tenancy History
            </h2>
            <div className="space-y-3">
              {property.tenancies
                .filter((t) => t.id !== currentTenancy?.id)
                .map((tenancy) => (
                  <div
                    key={tenancy.id}
                    className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0"
                  >
                    <div>
                      <p className="text-sm font-medium text-gray-700">
                        {tenancy.tenant.name}
                      </p>
                      <p className="text-xs text-gray-400">
                        {tenancy.tenant.email}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                          tenancy.status === 'EXPIRED'
                            ? 'bg-gray-100 text-gray-500'
                            : tenancy.status === 'TERMINATED'
                              ? 'bg-red-100 text-red-600'
                              : 'bg-amber-100 text-amber-700'
                        }`}
                      >
                        {tenancy.status.charAt(0) +
                          tenancy.status.slice(1).toLowerCase()}
                      </span>
                      <Link
                        href={`/dashboard/landlord/tenancies/${tenancy.id}`}
                        className="text-xs text-blue-600 hover:underline"
                      >
                        View →
                      </Link>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
