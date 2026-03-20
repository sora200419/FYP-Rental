import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { redirect } from 'next/navigation';

export default async function DashboardPage() {
  // getServerSession runs on the server — reads the JWT and returns session data
  const session = await getServerSession(authOptions);

  // Not logged in → send to login
  if (!session) {
    redirect('/login');
  }

  // Redirect to the correct dashboard based on the user's role
  if (session.user.role === 'LANDLORD') {
    redirect('/dashboard/landlord');
  }

  if (session.user.role === 'TENANT') {
    redirect('/dashboard/tenant');
  }

  if (session.user.role === 'ADMIN') {
    redirect('/dashboard/admin');
  }

  // Fallback
  redirect('/login');
}
