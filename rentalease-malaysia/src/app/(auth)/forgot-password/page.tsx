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
  const [submitted, setSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: data.email }),
      });
      if (!res.ok) {
        const json = await res.json().catch(() => null);
        setServerError(json?.error || 'Something went wrong');
        return;
      }

      // The API always answers the same way whether or not the email exists
      // (no account enumeration); the reset link itself is sent by email.
      setSubmitted(true);
    } catch {
      setServerError('Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#0f172a] flex items-center justify-center px-4 py-12">
      {/* Decorative gold rings — top right */}
      <div className="pointer-events-none absolute -top-24 -right-24">
        <div className="h-[400px] w-[400px] rounded-full border border-[rgba(196,154,60,0.08)]" />
        <div className="absolute inset-10 rounded-full border border-[rgba(196,154,60,0.06)]" />
      </div>
      {/* Decorative gold rings — bottom left */}
      <div className="pointer-events-none absolute -bottom-16 -left-16">
        <div className="h-[300px] w-[300px] rounded-full border border-[rgba(196,154,60,0.06)]" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-sm rounded-2xl border border-[rgba(196,154,60,0.25)] bg-[rgba(28,39,64,0.75)] p-8 shadow-2xl backdrop-blur-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-serif text-base font-bold tracking-[0.3em] text-[#C49A3C] uppercase">RentalEase</p>
          <div className="mx-auto mt-2 h-px w-10 bg-gradient-to-r from-transparent via-[#C49A3C] to-transparent" />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">Malaysia</p>
        </div>

        <h2 className="text-2xl font-bold text-white mb-1">Reset password</h2>
        <p className="text-sm text-white/50 mb-8">
          Enter your account email and we will email you a reset link.
        </p>

        {submitted ? (
          <div className="rounded-lg border border-[rgba(196,154,60,0.25)] bg-[rgba(196,154,60,0.08)] px-4 py-4 text-sm text-[#C49A3C]">
            If that email is registered, we have sent a password reset link to it. The link expires
            shortly, so please check your inbox (and spam folder) soon.
          </div>
        ) : (
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/40">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                placeholder="you@example.com"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors"
              />
              {errors.email && (
                <p className="text-xs text-[#f87171] mt-1">{errors.email.message}</p>
              )}
            </div>

            {serverError && (
              <div className="flex items-start gap-3 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
                <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                {serverError}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-lg bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] py-2.5 text-sm font-bold text-[#1C2740] transition-opacity disabled:opacity-50 hover:opacity-90"
            >
              {isLoading ? 'Sending…' : 'Send Reset Link'}
            </button>
          </form>
        )}

        <p className="text-center text-sm text-white/50 mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-[#C49A3C] hover:text-[#E8B84B] transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
