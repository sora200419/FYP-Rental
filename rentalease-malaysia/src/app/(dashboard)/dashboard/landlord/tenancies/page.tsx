import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandlordTenanciesPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Tenancies</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your active and past tenancy agreements.
        </p>
      </div>
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <p className="text-4xl mb-4">📋</p>
        <p className="text-gray-700 font-semibold text-lg">Coming soon</p>
        <p className="text-gray-400 text-sm mt-1">
          Tenancy management will be available in the next phase.
        </p>
      </div>
    </div>
  );
}
