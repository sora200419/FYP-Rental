import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function LandlordDashboard() {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'LANDLORD') redirect('/login');

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold">Welcome, {session.user.name} 👋</h1>
      <p className="text-gray-500 mt-1">Landlord Dashboard — coming soon</p>
    </div>
  );
}
