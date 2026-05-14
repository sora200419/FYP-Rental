import { getServerSession } from 'next-auth';
import { redirect } from 'next/navigation';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { PageHeader, StatCard } from '@/components/ui/RedesignPrimitives';
import { AdminNav } from '@/components/ui/AdminTabBar';
import SuspendButton from '@/components/ui/SuspendButton';
import DeleteUserButton from '@/components/ui/DeleteUserButton';

function getKycBadge(isVerified: boolean, hasDocument: boolean) {
  if (isVerified) return { label: 'Verified', cls: 'bg-green-100 text-green-700' };
  if (hasDocument) return { label: 'Pending', cls: 'bg-amber-100 text-amber-700' };
  return { label: 'Unverified', cls: 'bg-gray-100 text-gray-500' };
}

export default async function AdminUsersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; role?: string; status?: string }>;
}) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/dashboard/admin');

  const params = await searchParams;
  const q = params.q?.trim() ?? '';
  const roleFilter = params.role ?? 'all';
  const safeRole = (['LANDLORD', 'TENANT'] as const).find((r) => r === params.role) ?? null;
  const statusFilter = params.status ?? 'all';

  const where = {
    role: safeRole ?? { not: 'ADMIN' as const },
    ...(statusFilter === 'suspended' && { isSuspended: true }),
    ...(statusFilter === 'active' && { isSuspended: false }),
    ...(q && {
      OR: [
        { name: { contains: q, mode: 'insensitive' as const } },
        { email: { contains: q, mode: 'insensitive' as const } },
      ],
    }),
  };

  const [users, totalCount, suspendedCount, landlordCount, tenantCount] = await Promise.all([
    prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isVerified: true,
        isSuspended: true,
        createdAt: true,
        tenantDocuments: { select: { id: true }, take: 1 },
        ownedProperties: {
          where: { isVerified: true },
          select: { id: true },
        },
        tenancies: {
          where: { status: { in: ['INVITED', 'PENDING', 'ACTIVE'] } },
          select: { id: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    prisma.user.count({ where: { role: { not: 'ADMIN' }, isSuspended: true } }),
    prisma.user.count({ where: { role: 'LANDLORD' } }),
    prisma.user.count({ where: { role: 'TENANT' } }),
  ]);

  return (
    <div className="max-w-5xl">
      <AdminNav active="users" />

      <PageHeader
        eyebrow="Admin"
        title="User Management"
        description="View, suspend, and remove user accounts."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Total users" value={totalCount} />
        <StatCard label="Suspended" value={suspendedCount} tone={suspendedCount > 0 ? 'amber' : 'default'} />
        <StatCard label="Breakdown" value={`${landlordCount}L · ${tenantCount}T`} />
      </div>

      <form method="GET" className="mb-6 grid gap-3 rounded-xl border border-gray-200 bg-white p-4 md:grid-cols-3">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search name or email"
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
        <select
          name="role"
          defaultValue={roleFilter}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        >
          <option value="all">All roles</option>
          <option value="LANDLORD">Landlord</option>
          <option value="TENANT">Tenant</option>
        </select>
        <select
          name="status"
          defaultValue={statusFilter}
          className="rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        <button
          type="submit"
          className="rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 md:col-span-3"
        >
          Filter
        </button>
      </form>

      {users.length === 0 ? (
        <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
          <p className="text-base font-semibold text-gray-700">No users found</p>
          <p className="mt-1 text-sm text-gray-400">Try adjusting your search or filters.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {users.map((user) => {
            const kyc = getKycBadge(user.isVerified, user.tenantDocuments.length > 0);
            const activityCount =
              user.role === 'LANDLORD'
                ? user.ownedProperties.length
                : user.tenancies.length;
            const activityLabel =
              user.role === 'LANDLORD'
                ? `${activityCount} active propert${activityCount !== 1 ? 'ies' : 'y'}`
                : `${activityCount} active tenanc${activityCount !== 1 ? 'ies' : 'y'}`;

            return (
              <div
                key={user.id}
                className={`rounded-xl border bg-white p-4 ${user.isSuspended ? 'border-red-200' : 'border-gray-200'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-sm font-semibold text-gray-900">{user.name}</p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                          user.role === 'LANDLORD'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-green-100 text-green-700'
                        }`}
                      >
                        {user.role === 'LANDLORD' ? 'Landlord' : 'Tenant'}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${kyc.cls}`}>
                        {kyc.label}
                      </span>
                      {user.isSuspended && (
                        <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-700">
                          Suspended
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 truncate text-xs text-gray-500">{user.email}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {activityLabel} · Joined {new Date(user.createdAt).toLocaleDateString('en-MY')}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <SuspendButton
                      userId={user.id}
                      userName={user.name}
                      isSuspended={user.isSuspended}
                    />
                    <DeleteUserButton userId={user.id} userName={user.name} />
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
