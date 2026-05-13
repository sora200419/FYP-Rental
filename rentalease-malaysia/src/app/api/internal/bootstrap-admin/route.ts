import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { ensureAdminBootstrap } from '@/lib/admin/bootstrap';

function isAuthorized(request: Request, sessionRole?: string) {
  if (sessionRole === 'ADMIN') return true;

  const secret = process.env.NEXTAUTH_SECRET?.trim();
  const headerSecret = request.headers.get('x-bootstrap-secret')?.trim();
  return Boolean(secret && headerSecret && secret === headerSecret);
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);

  if (!isAuthorized(request, session?.user?.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const result = await ensureAdminBootstrap();

  if (!result.ok) {
    return NextResponse.json(
      { error: 'Missing ADMIN_EMAIL or ADMIN_PASSWORD in .env' },
      { status: 400 },
    );
  }

  return NextResponse.json(result);
}
