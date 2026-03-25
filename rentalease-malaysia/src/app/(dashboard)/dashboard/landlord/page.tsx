import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import Link from 'next/link';

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  const [propertyCount, activeTenancyCount, pendingAgreementCount] =
    await Promise.all([
      prisma.property.count({
        where: { landlordId: session.user.id },
      }),
      prisma.tenancy.count({
        where: {
          property: { landlordId: session.user.id },
          status: 'ACTIVE',
        },
      }),
      prisma.agreement.count({
        where: {
          tenancy: { property: { landlordId: session.user.id } },
          status: 'DRAFT',
        },
      }),
    ]);

  // Summary cards data — easy to extend later with more metrics
  const stats = [
    {
      label: 'Total Properties',
      value: propertyCount,
      href: '/dashboard/landlord/properties',
      description: 'View all properties',
      color: 'bg-blue-50 text-blue-600',
    },
    {
      label: 'Active Tenancies',
      value: activeTenancyCount,
      href: '/dashboard/landlord/tenancies',
      description: 'View active tenancies',
      color: 'bg-green-50 text-green-600',
    },
    {
      label: 'Pending Agreements',
      value: pendingAgreementCount,
      href: '/dashboard/landlord/tenancies',
      description: 'Agreements awaiting action',
      color: 'bg-amber-50 text-amber-600',
    },
  ];

  return (
    <div>
      {/* Page header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {session.user.name} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          Here&apos;s an overview of your rental portfolio.
        </p>
      </div>

      {/* Summary stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            <p className="text-sm font-medium text-gray-500">{stat.label}</p>
            <p
              className={`text-4xl font-bold mt-2 ${stat.color.split(' ')[1]}`}
            >
              {stat.value}
            </p>
            <p className="text-xs text-gray-400 mt-2">{stat.description} →</p>
          </Link>
        ))}
      </div>

      {/* Quick action — most common first action for a new landlord */}
      {propertyCount === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-6 flex items-center justify-between">
          <div>
            <p className="font-semibold text-blue-900">
              Add your first property
            </p>
            <p className="text-sm text-blue-700 mt-1">
              Start by adding a property before creating a tenancy agreement.
            </p>
          </div>
          <Link
            href="/dashboard/landlord/properties/new"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap"
          >
            Add Property
          </Link>
        </div>
      )}
    </div>
  );
}
