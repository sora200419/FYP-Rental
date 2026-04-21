// src/app/(dashboard)/dashboard/landlord/page.tsx
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';
import { DashboardBanners } from '@/components/ui/DashboardBanners';

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);

  if (!session?.user) redirect('/login');
  if (session.user.role !== 'LANDLORD') redirect('/dashboard/tenant');

  const landlordId = session.user.id;

  // Run all data fetches in parallel to minimise server response time
  const [
    properties,
    recentTenancies,
    pendingChangesRequested,
    pendingPaymentVerifications,
    unacknowledgedConditionReports,
  ] = await Promise.all([
    // Properties with room and tenancy summaries
    prisma.property.findMany({
      where: { landlordId },
      include: {
        rooms: {
          include: {
            tenancies: {
              where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
              include: {
                tenant: { select: { id: true, name: true, email: true } },
                agreement: { select: { id: true, status: true } },
              },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),

    // 10 most recent tenancies across all properties
    prisma.tenancy.findMany({
      where: {
        room: { property: { landlordId } },
        status: { in: ['INVITED', 'PENDING', 'ACTIVE'] },
      },
      include: {
        tenant: { select: { id: true, name: true, email: true } },
        room: {
          include: {
            property: { select: { id: true, address: true, city: true } },
          },
        },
        agreement: { select: { id: true, status: true } },
        rentPayments: {
          where: { status: 'UNDER_REVIEW' },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }),

    // ── Banner counts ────────────────────────────────────────────────────────
    // Agreements where tenant requested changes
    prisma.agreement.count({
      where: {
        status: 'NEGOTIATING',
        tenancy: { room: { property: { landlordId } } },
      },
    }),

    // Payment proofs awaiting verification
    prisma.rentPayment.count({
      where: {
        status: 'UNDER_REVIEW',
        tenancy: { room: { property: { landlordId } } },
      },
    }),

    // Condition reports created by tenant, not yet acknowledged
    prisma.conditionReport.count({
      where: {
        acknowledgedAt: null,
        tenancy: { room: { property: { landlordId } } },
        createdBy: { role: 'TENANT' },
      },
    }),
  ]);

  // Derive summary stats from fetched data
  const totalRooms = properties.reduce((sum, p) => sum + p.rooms.length, 0);
  const activeRooms = properties.reduce(
    (sum, p) =>
      sum +
      p.rooms.filter((r) => r.tenancies.some((t) => t.status === 'ACTIVE'))
        .length,
    0,
  );
  const invitedTenancies = recentTenancies.filter(
    (t) => t.status === 'INVITED',
  ).length;

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Welcome back, {session.user.name}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Manage your properties, tenants, and agreements
          </p>
        </div>

        {/* Dashboard banners — Phase B: shows urgent items needing action */}
        <DashboardBanners
          role="LANDLORD"
          pendingChangesRequested={pendingChangesRequested}
          pendingPaymentVerifications={pendingPaymentVerifications}
          unacknowledgedConditionReports={unacknowledgedConditionReports}
        />

        {/* Summary stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Properties" value={properties.length} />
          <StatCard label="Total Rooms" value={totalRooms} />
          <StatCard label="Occupied Rooms" value={activeRooms} />
          <StatCard
            label="Pending Invitations"
            value={invitedTenancies}
            accent
          />
        </div>

        {/* Quick actions */}
        <div className="flex flex-wrap gap-3 mb-8">
          <Link
            href="/dashboard/landlord/properties/new"
            className="inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            <span>+</span> Add Property
          </Link>
          <Link
            href="/dashboard/landlord/tenancies/new"
            className="inline-flex items-center gap-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors"
          >
            Invite Tenant
          </Link>
        </div>

        {/* Recent tenancies */}
        {recentTenancies.length > 0 ? (
          <section className="mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Active &amp; Pending Tenancies
            </h2>
            <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
              {recentTenancies.map((tenancy) => (
                <TenancyRow key={tenancy.id} tenancy={tenancy} />
              ))}
            </div>
          </section>
        ) : (
          <div className="bg-white rounded-xl border border-gray-200 p-12 text-center mb-8">
            <p className="text-gray-500 text-sm">
              No active tenancies yet.{' '}
              <Link
                href="/dashboard/landlord/tenancies/new"
                className="text-blue-600 hover:underline"
              >
                Invite a tenant
              </Link>{' '}
              to get started.
            </p>
          </div>
        )}

        {/* Properties overview */}
        {properties.length > 0 && (
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">
                Your Properties
              </h2>
              <Link
                href="/dashboard/landlord/properties"
                className="text-sm text-blue-600 hover:underline"
              >
                View all
              </Link>
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {properties.slice(0, 6).map((property) => (
                <div
                  key={property.id}
                  className="bg-white rounded-xl border border-gray-200 p-4"
                >
                  <p className="font-medium text-gray-900 text-sm truncate">
                    {property.address}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {property.city}, {property.state}
                  </p>
                  <div className="flex items-center gap-3 mt-3 text-xs text-gray-600">
                    <span>
                      {property.rooms.length} room
                      {property.rooms.length !== 1 ? 's' : ''}
                    </span>
                    <span>·</span>
                    <span>
                      {property.rooms.filter((r) => !r.isAvailable).length}{' '}
                      occupied
                    </span>
                  </div>
                  <Link
                    href={`/dashboard/landlord/properties/${property.id}`}
                    className="block mt-3 text-xs text-blue-600 hover:underline"
                  >
                    Manage →
                  </Link>
                </div>
              ))}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  accent = false,
}: {
  label: string;
  value: number;
  accent?: boolean;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4">
      <p className="text-xs text-gray-500 font-medium">{label}</p>
      <p
        className={`text-3xl font-bold mt-1 ${
          accent ? 'text-blue-600' : 'text-gray-900'
        }`}
      >
        {value}
      </p>
    </div>
  );
}

function TenancyRow({
  tenancy,
}: {
  tenancy: ReturnType<typeof buildTenancyRow>;
}) {
  const statusColors: Record<string, string> = {
    INVITED: 'bg-yellow-100 text-yellow-700',
    PENDING: 'bg-blue-100 text-blue-700',
    ACTIVE: 'bg-green-100 text-green-700',
    EXPIRED: 'bg-gray-100 text-gray-600',
    TERMINATED: 'bg-red-100 text-red-700',
  };

  const hasProofToVerify = tenancy.rentPayments.length > 0;

  return (
    <div className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900 truncate">
          {tenancy.tenant.name}
        </p>
        <p className="text-xs text-gray-500 mt-0.5 truncate">
          {tenancy.room.property.address}, {tenancy.room.property.city}
        </p>
      </div>
      <div className="flex items-center gap-3 ml-4 flex-shrink-0">
        {hasProofToVerify && (
          <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">
            Proof to verify
          </span>
        )}
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${
            statusColors[tenancy.status] ?? 'bg-gray-100 text-gray-600'
          }`}
        >
          {tenancy.status}
        </span>
        <Link
          href={`/dashboard/landlord/tenancies/${tenancy.id}`}
          className="text-xs text-blue-600 hover:underline"
        >
          View
        </Link>
      </div>
    </div>
  );
}

// Type helper so TypeScript is happy with the tenancy shape in TenancyRow
function buildTenancyRow(t: unknown) {
  return t as {
    id: string;
    status: string;
    tenant: { id: string; name: string; email: string };
    room: { property: { id: string; address: string; city: string } };
    agreement: { id: string; status: string } | null;
    rentPayments: { id: string }[];
  };
}
