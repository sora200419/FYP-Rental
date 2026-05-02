import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';

export default async function AdminDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'ADMIN') redirect('/login');

  const [totalUsers, unverifiedCount, totalProperties, unverifiedPropertiesCount] = await Promise.all([
    prisma.user.count({ where: { role: { not: 'ADMIN' } } }),
    prisma.user.count({ where: { isVerified: false, role: { not: 'ADMIN' } } }),
    prisma.property.count(),
    prisma.property.count({ where: { isVerified: false } }),
  ]);

  return (
    <div className="max-w-4xl mx-auto py-10 px-6">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin Dashboard</h1>
      <p className="text-gray-500 text-sm mb-8">Platform overview and KYC verification queue.</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Total Users</p>
          <p className="text-3xl font-bold text-gray-900">{totalUsers}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">Users Pending KYC</p>
          <p className="text-3xl font-bold text-amber-700">{unverifiedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Properties Listed</p>
          <p className="text-3xl font-bold text-gray-900">{totalProperties}</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
          <p className="text-xs text-amber-600 font-medium uppercase tracking-wide mb-1">Properties Pending</p>
          <p className="text-3xl font-bold text-amber-700">{unverifiedPropertiesCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        <a
          href="/dashboard/admin/verify"
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm">KYC Verification Queue</p>
            <p className="text-xs text-gray-500 mt-0.5">Review pending identity documents and approve users</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </a>
        <a
          href="/dashboard/admin/properties"
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:shadow-md transition-shadow"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm">Property Verification Queue</p>
            <p className="text-xs text-gray-500 mt-0.5">Review and approve new property listings before tenants can be invited</p>
          </div>
          <span className="text-gray-400 text-lg">→</span>
        </a>
      </div>
    </div>
  );
}
