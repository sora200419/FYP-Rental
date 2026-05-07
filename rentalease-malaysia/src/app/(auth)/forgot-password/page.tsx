'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const schema = z.object({
  email: z.string().email('Enter a valid email address'),
});
type FormData = z.infer<typeof schema>;

export default function ForgotPasswordPage() {
  const [resetLink, setResetLink] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);
    setResetLink(null);

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      const json = await res.json();

      if (!res.ok) {
        setServerError(json.error || 'Something went wrong');
        return;
      }

      if (json.token) {
        setResetLink(`${window.location.origin}/reset-password?token=${json.token}`);
      } else {
        // Email not found — show generic message (no enumeration)
        setResetLink('not-found');
      }
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex">
      {/* Left panel */}
      <div className="hidden lg:flex w-5/12 bg-gray-900 flex-col items-center justify-center p-12">
        <span className="text-4xl font-bold text-white tracking-tight">RentalEase</span>
        <p className="text-gray-400 mt-3 text-center text-sm leading-relaxed max-w-xs">
          AI-Assisted Digital Tenancy Platform for Malaysian Residential Rentals
        </p>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
        <div className="w-full max-w-sm">
          <p className="lg:hidden text-2xl font-bold text-gray-900 mb-1">RentalEase</p>
          <h2 className="text-2xl font-bold text-gray-900 mb-1">Reset password</h2>
          <p className="text-sm text-gray-500 mb-8">
            Enter your account email and we will generate a reset link.
          </p>

          {resetLink === 'not-found' ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-4 py-4 text-sm text-blue-800">
              If that email is registered, a reset link has been generated. Check with your admin or try signing in.
            </div>
          ) : resetLink ? (
            <div className="space-y-4">
              <div className="bg-green-50 border border-green-200 rounded-lg px-4 py-4 text-sm text-green-800">
                <p className="font-semibold mb-1">Reset link generated</p>
                <p className="text-xs text-green-700 mb-3">
                  In production this would be sent to your email. Copy the link below to reset your password.
                </p>
                <div className="bg-white border border-green-200 rounded-md px-3 py-2 break-all text-xs text-gray-700 select-all">
                  {resetLink}
                </div>
              </div>
              <a
                href={resetLink}
                className="block w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
              >
                Go to Reset Page
              </a>
            </div>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">
                  Email Address
                </label>
                <input
                  {...register('email')}
                  type="email"
                  placeholder="you@example.com"
                  className="w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                />
                {errors.email && (
                  <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
                )}
              </div>

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
                {isLoading ? 'Generating link…' : 'Send Reset Link'}
              </button>
            </form>
          )}

          <p className="text-center text-sm text-gray-500 mt-6">
            Remember your password?{' '}
            <Link href="/login" className="text-blue-600 hover:underline font-medium">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
