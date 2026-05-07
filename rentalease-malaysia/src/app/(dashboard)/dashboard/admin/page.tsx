import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

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

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Admin Dashboard</h1>
        <p className="text-sm text-gray-500 mt-1">Platform overview and verification queues</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Total Users</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalUsers}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending KYC</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{unverifiedCount}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Properties</p>
          <p className="text-3xl font-bold text-gray-900 mt-2">{totalProperties}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Pending Properties</p>
          <p className="text-3xl font-bold text-blue-600 mt-2">{unverifiedPropertiesCount}</p>
        </div>
      </div>

      <div className="space-y-3">
        <Link
          href="/dashboard/admin/verify"
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm">KYC Verification Queue</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Review pending identity documents and approve users
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
        <Link
          href="/dashboard/admin/properties"
          className="flex items-center justify-between bg-white border border-gray-200 rounded-xl px-5 py-4 hover:border-gray-300 transition-colors"
        >
          <div>
            <p className="font-semibold text-gray-900 text-sm">Property Verification Queue</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Review and approve new property listings before tenants can be invited
            </p>
          </div>
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      </div>
    </div>
  );
}
