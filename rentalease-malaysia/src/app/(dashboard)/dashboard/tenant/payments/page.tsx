import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function TenantPaymentsPage() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'TENANT') redirect('/login');

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
        <p className="text-gray-500 mt-1 text-sm">
          Track your rent payment history and upcoming dues.
        </p>
      </div>
      <div className="text-center py-20 bg-white rounded-xl border border-gray-200">
        <p className="text-4xl mb-4">💳</p>
        <p className="text-gray-700 font-semibold text-lg">Coming soon</p>
        <p className="text-gray-400 text-sm mt-1">
          Payment tracking will be available once your tenancy is active.
        </p>
      </div>
    </div>
  );
}
