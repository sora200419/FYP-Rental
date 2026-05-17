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
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] flex items-center justify-center px-4 py-12">
      {/* Decorative gold rings — top right */}
      <div className="pointer-events-none absolute -top-24 -right-24">
        <div className="h-[400px] w-[400px] rounded-full border border-[rgba(196,154,60,0.08)]" />
        <div className="absolute inset-10 rounded-full border border-[rgba(196,154,60,0.06)]" />
        <div className="absolute inset-20 rounded-full border border-[rgba(196,154,60,0.04)]" />
      </div>
      {/* Decorative gold rings — bottom left */}
      <div className="pointer-events-none absolute -bottom-16 -left-16">
        <div className="h-[300px] w-[300px] rounded-full border border-[rgba(196,154,60,0.06)]" />
        <div className="absolute inset-8 rounded-full bg-[rgba(196,154,60,0.02)]" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[rgba(196,154,60,0.25)] bg-[rgba(28,39,64,0.75)] p-8 shadow-2xl backdrop-blur-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-serif text-base font-bold tracking-[0.3em] text-[#C49A3C] uppercase">
            RentalEase
          </p>
          <div className="mx-auto mt-2 h-px w-10 bg-gradient-to-r from-transparent via-[#C49A3C] to-transparent" />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">Malaysia</p>
        </div>

        {isSuspended && (
          <div className="mb-6 rounded-lg border border-[rgba(251,191,36,0.25)] bg-[rgba(251,191,36,0.08)] px-4 py-3 text-sm text-[#facc15]">
            Your account has been suspended. Please contact the platform administrator.
          </div>
        )}

        <Suspense
          fallback={
            <div className="space-y-5 animate-pulse">
              <div className="h-10 rounded-lg bg-white/5" />
              <div className="h-10 rounded-lg bg-white/5" />
              <div className="h-10 rounded-lg bg-white/5" />
            </div>
          }
        >
          <LoginForm />
        </Suspense>

        <p className="mt-6 text-center text-sm text-white/40">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#C49A3C] hover:text-[#E8B84B] transition-colors">
            Create one
          </Link>
        </p>
      </div>
    </div>
  );
}
