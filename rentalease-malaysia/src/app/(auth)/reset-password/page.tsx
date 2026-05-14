'use client';

import { Suspense, useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import { PasswordInput } from '@/components/ui/PasswordInput';

const schema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirm: z.string(),
}).refine((d) => d.password === d.confirm, {
  message: 'Passwords do not match',
  path: ['confirm'],
});
type FormData = z.infer<typeof schema>;

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  if (!token) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg px-4 py-4 text-sm text-red-800">
        Invalid reset link. Please request a new one.{' '}
        <Link href="/forgot-password" className="underline font-medium">Try again</Link>
      </div>
    );
  }

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch('/api/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password: data.password }),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Something went wrong');
        return;
      }

      router.push('/login?reset=true');
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
      <PasswordInput
        registration={register('password')}
        label="New Password"
        placeholder="Min. 8 characters"
        error={errors.password?.message}
      />
      <PasswordInput
        registration={register('confirm')}
        label="Confirm New Password"
        placeholder="Re-enter your new password"
        error={errors.confirm?.message}
      />

      {serverError && (
        <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
          <svg className="w-4 h-4 text-red-500 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {serverError}
        </div>
      )}

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
      >
        {isLoading ? 'Resetting…' : 'Reset Password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
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

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="lg:hidden text-2xl font-bold text-gray-900 mb-1">RentalEase</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Set new password</h2>
          <p className="text-sm text-gray-500 mb-8">Choose a new password for your account.</p>

          <Suspense fallback={<div className="space-y-5 animate-pulse"><div className="h-10 bg-gray-100 rounded-lg" /><div className="h-10 bg-gray-100 rounded-lg" /><div className="h-10 bg-gray-100 rounded-lg" /></div>}>
            <ResetPasswordForm />
          </Suspense>

          <p className="text-center text-sm text-gray-500 mt-6">
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Back to sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
