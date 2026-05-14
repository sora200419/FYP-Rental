import { Suspense } from 'react';
import Link from 'next/link';
import LoginForm from './LoginForm';

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const params = await searchParams;
  const isSuspended = params.reason === 'suspended';

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex w-5/12 bg-gray-900 flex-col items-center justify-center p-12">
        <span className="text-4xl font-bold tracking-tight text-white">RentalEase</span>
        <p className="mt-4 max-w-sm text-center text-sm leading-relaxed text-gray-400">
          A guided tenancy workspace for Malaysian rentals, from invitation to agreement, payment, and handover records.
        </p>
        <ul className="mt-10 space-y-3 text-sm text-gray-400 max-w-xs w-full">
          {[
            'AI-assisted tenancy agreement review',
            'Identity and property verification workflows',
            'Payment proof and deposit records',
            'Tenant-landlord messages in context',
          ].map((item) => (
            <li key={item} className="flex items-center gap-2.5">
              <svg className="w-4 h-4 text-blue-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              {item}
            </li>
          ))}
        </ul>
      </div>

      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          {/* Mobile logo */}
          <p className="lg:hidden text-2xl font-bold text-gray-900 mb-1">RentalEase</p>

          {isSuspended && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-800">
              Your account has been suspended. Please contact the platform administrator.
            </div>
          )}

          <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
          <p className="text-sm text-gray-500 mb-8">Welcome back</p>

          <Suspense
            fallback={
              <div className="space-y-5 animate-pulse">
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
                <div className="h-10 bg-gray-100 rounded-lg" />
              </div>
            }
          >
            <LoginForm />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-blue-600 hover:underline font-medium">
              Create one
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
