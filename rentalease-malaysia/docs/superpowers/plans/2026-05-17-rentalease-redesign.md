# RentalEase UI Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Extend the AgreementViewer's navy `#1C2740` + gold `#C49A3C` design system across every user-facing page — login, register, sidebar, dashboard, properties, tenancies, and payments.

**Architecture:** Shared-component-first: update `DashboardShell`, `Sidebar`, and `RedesignPrimitives` first so all dashboard pages inherit the dark theme automatically, then fix per-page inline colour overrides, then rewrite auth pages with the atmospheric glass-card layout.

**Tech Stack:** Next.js 15 App Router, TypeScript, Tailwind CSS v4, React Hook Form + Zod, NextAuth.js

> **Note:** No test suite is configured (`npm run build` = TypeScript + Next.js compile check). Each task ends with a build check and visual verification in the dev server.

---

## File Map

| File | Action |
|---|---|
| `src/components/ui/DashboardShell.tsx` | Modify — page bg, header bar |
| `src/components/ui/Sidebar.tsx` | Modify — sidebar colours, logo, nav links, user footer |
| `src/components/ui/RedesignPrimitives.tsx` | Modify — all 5 primitives |
| `src/components/ui/PasswordInput.tsx` | Modify — dark input/label styling |
| `src/app/(auth)/login/page.tsx` | Modify — new atmospheric layout |
| `src/app/(auth)/login/LoginForm.tsx` | Modify — dark form fields + buttons |
| `src/app/(auth)/register/page.tsx` | Modify — new atmospheric layout + dark form |
| `src/app/(auth)/forgot-password/page.tsx` | Modify — new atmospheric layout |
| `src/app/(auth)/reset-password/page.tsx` | Modify — new atmospheric layout |
| `src/app/(dashboard)/dashboard/landlord/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/tenant/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/landlord/properties/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/landlord/tenancies/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/landlord/payments/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/tenant/payments/page.tsx` | Modify — inline colour overrides |
| `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx` | Modify — inline colour overrides |

---

## Task 1: DashboardShell — page background and header

**Files:**
- Modify: `src/components/ui/DashboardShell.tsx`

- [ ] **Step 1: Apply dark theme to outer shell, header, and message icon**

Replace the entire `DashboardShell` return JSX. The data-fetching logic (`fetchUnreadCounts`, `useEffect`, etc.) stays identical — only class names change:

```tsx
return (
  <div className="flex h-screen overflow-hidden bg-[#0f172a]">
    {/* Desktop sidebar */}
    <Sidebar />

    {/* Mobile drawer */}
    <MobileSidebarDrawer open={mobileOpen} onClose={() => setMobileOpen(false)} />

    {/* Main column */}
    <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
      {/* Top header bar */}
      <header className="h-14 bg-[#1C2740] border-b border-[rgba(196,154,60,0.15)] flex items-center px-4 sm:px-6 gap-3 shrink-0 sticky top-0 z-20">
        <MenuToggleButton onClick={() => setMobileOpen(true)} />

        {/* Spacer */}
        <div className="flex-1" />

        {/* Messages link — not for ADMIN */}
        {role !== 'ADMIN' && (
          <Link
            href={messagesHref}
            className="relative p-2 rounded-full bg-white/5 text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors"
            aria-label={
              unreadCounts.messageCount > 0
                ? `Messages (${unreadCounts.messageCount} unread)`
                : 'Messages'
            }
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
            {unreadCounts.messageCount > 0 && (
              <span className="absolute top-0.5 right-0.5 inline-flex items-center justify-center min-w-[16px] h-[16px] px-0.5 text-[9px] font-bold text-[#1C2740] bg-[#C49A3C] rounded-full border border-[#1C2740]">
                {unreadCounts.messageCount > 9 ? '9+' : unreadCounts.messageCount}
              </span>
            )}
          </Link>
        )}

        {/* Notification bell */}
        <div className="relative">
          <NotificationBell
            count={unreadCounts.notificationCount}
            onClick={() => setNotificationOpen((v) => !v)}
          />
          <NotificationDropdown
            open={notificationOpen}
            onClose={() => setNotificationOpen(false)}
            onCountChanged={fetchUnreadCounts}
          />
        </div>
      </header>

      {/* Page content */}
      <main className="flex-1 p-6 lg:p-8">
        {children}
      </main>
    </div>
  </div>
);
```

- [ ] **Step 2: Verify build**

```bash
cd rentalease-malaysia && npm run build
```

Expected: no TypeScript errors.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/DashboardShell.tsx
git commit -m "feat: apply dark navy theme to DashboardShell page bg and header"
```

---

## Task 2: Sidebar — colours, logo, nav links, user footer

**Files:**
- Modify: `src/components/ui/Sidebar.tsx`

- [ ] **Step 1: Update SidebarContent logo and section label**

Find the logo block (around line 141) and section label (around line 146). Replace:

```tsx
{/* Logo */}
<div className="h-16 flex items-center px-5 border-b border-[rgba(196,154,60,0.15)] shrink-0">
  <span className="font-serif text-sm font-bold tracking-[0.25em] text-[#C49A3C] uppercase">
    RentalEase
  </span>
</div>

{/* Section label */}
<p className="px-5 pt-5 pb-1.5 text-[10px] font-semibold text-white/30 uppercase tracking-wider shrink-0">
  Navigation
</p>
```

- [ ] **Step 2: Update nav link active/inactive classes**

Find the `Link` inside the `navLinks.map` (around line 155) and replace just the className:

```tsx
className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
  active
    ? 'bg-[rgba(196,154,60,0.12)] text-[#C49A3C] border border-[rgba(196,154,60,0.25)]'
    : 'text-white/50 hover:bg-white/5 hover:text-white/80'
}`}
```

And the icon className inside the same map:

```tsx
<Icon className={`w-4 h-4 shrink-0 ${active ? 'text-[#C49A3C]' : 'text-white/30'}`} />
```

- [ ] **Step 3: Update bottom user section**

Find the bottom `<div className="border-t border-gray-800 ...">` (around line 173). Replace:

```tsx
<div className="border-t border-[rgba(196,154,60,0.15)] p-3 space-y-0.5 shrink-0">
```

Find both user avatar divs (admin non-clickable and profile link versions). Replace `bg-blue-600` with `bg-[#C49A3C] text-[#1C2740]` in both:

```tsx
<div className="w-7 h-7 rounded-full bg-[#C49A3C] flex items-center justify-center text-[#1C2740] text-xs font-semibold shrink-0">
  {session.user.name?.[0]?.toUpperCase() ?? '?'}
</div>
```

Find the profile Link hover class and replace:

```tsx
className="flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-white/5 transition-colors"
```

Find `text-gray-400 capitalize` (role label) and replace in both user display blocks:

```tsx
<p className="text-xs text-white/40 capitalize truncate leading-tight">
```

- [ ] **Step 4: Update desktop aside and mobile drawer background**

Find `bg-gray-900` in the `Sidebar` default export (around line 226) and in `MobileSidebarDrawer` aside. Replace both with `bg-[#1C2740]`:

```tsx
// Desktop sidebar
<aside className="hidden lg:flex w-60 min-h-screen bg-[#1C2740] flex-col shrink-0 sticky top-0 h-screen overflow-y-auto z-30">

// Mobile drawer aside
<aside className="relative z-50 flex w-60 h-full bg-[#1C2740] flex-col">
```

- [ ] **Step 5: Verify build and check visually**

```bash
npm run build
npm run dev
```

Open http://localhost:3000/dashboard — sidebar should be `#1C2740` with gold active link and gold logo. Page background `#0f172a`.

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Sidebar.tsx
git commit -m "feat: apply navy/gold theme to sidebar — logo, nav links, user footer"
```

---

## Task 3: RedesignPrimitives — all five shared components

**Files:**
- Modify: `src/components/ui/RedesignPrimitives.tsx`

- [ ] **Step 1: Replace entire file content**

The file currently has 5 exports. Replace with the dark-themed versions below (keep the same imports and TypeScript interfaces — only class names change):

```tsx
import Link from 'next/link';
import type { ReactNode } from 'react';

type PageHeaderProps = {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: ReactNode;
};

export function PageHeader({ eyebrow, title, description, action }: PageHeaderProps) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow && (
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-[#C49A3C]">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-2xl font-bold tracking-tight text-white">{title}</h1>
        {description && <p className="mt-1 text-sm text-white/50">{description}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

type AttentionHeroProps = {
  title: string;
  description: string;
  actionLabel: string;
  href: string;
  secondary?: ReactNode;
};

export function AttentionHero({
  title,
  description,
  actionLabel,
  href,
  secondary,
}: AttentionHeroProps) {
  return (
    <section className="mb-6 rounded-2xl border border-[rgba(196,154,60,0.3)] bg-gradient-to-br from-[rgba(196,154,60,0.12)] to-[rgba(196,154,60,0.04)] p-5">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[#C49A3C]">
            Action Required
          </p>
          <h2 className="mt-2 font-serif text-2xl font-bold tracking-tight text-white">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-white/50">{description}</p>
          <Link
            href={href}
            className="mt-4 inline-flex rounded-lg bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] px-4 py-2.5 text-sm font-bold text-[#1C2740] transition-opacity hover:opacity-90"
          >
            {actionLabel}
          </Link>
        </div>
        {secondary && (
          <div className="rounded-xl border border-[rgba(196,154,60,0.2)] bg-[rgba(255,255,255,0.04)] p-4">
            {secondary}
          </div>
        )}
      </div>
    </section>
  );
}

type StatCardProps = {
  label: string;
  value: ReactNode;
  detail?: ReactNode;
  tone?: 'default' | 'blue' | 'green' | 'amber' | 'red';
};

const toneText = {
  default: 'text-white',
  blue: 'text-[#C49A3C]',
  green: 'text-[#4ade80]',
  amber: 'text-[#E8B84B]',
  red: 'text-[#f87171]',
};

export function StatCard({ label, value, detail, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-[rgba(196,154,60,0.2)] bg-[#1C2740] p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-white/35">{label}</p>
      <p className={`mt-2 truncate font-serif text-2xl font-bold ${toneText[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-white/30">{detail}</p>}
    </div>
  );
}

export function SectionCard({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740]${
        className ? ` ${className}` : ''
      }`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-[rgba(196,154,60,0.12)] px-5 py-4">
        <h2 className="text-base font-semibold text-white">{title}</h2>
        {action}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-12 text-center">
      <p className="text-base font-semibold text-white">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-white/40">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Expected: no errors. All pages using `PageHeader`, `StatCard`, `SectionCard`, `AttentionHero`, `EmptyState` will automatically pick up the dark theme.

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/RedesignPrimitives.tsx
git commit -m "feat: apply navy/gold theme to all RedesignPrimitives components"
```

---

## Task 4: PasswordInput — dark field styling

**Files:**
- Modify: `src/components/ui/PasswordInput.tsx`

- [ ] **Step 1: Replace the JSX with dark styles**

```tsx
'use client';

import { useState } from 'react';
import { EyeIcon, EyeOffIcon } from './icons';

interface PasswordInputProps {
  registration: React.InputHTMLAttributes<HTMLInputElement>;
  label: string;
  placeholder: string;
  error?: string;
}

export function PasswordInput({
  registration,
  label,
  placeholder,
  error,
}: PasswordInputProps) {
  const [show, setShow] = useState(false);

  return (
    <div>
      <label className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/40">
        {label}
      </label>
      <div className="relative">
        <input
          {...registration}
          type={show ? 'text' : 'password'}
          placeholder={placeholder}
          className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 pr-10 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors"
        />
        <button
          type="button"
          onClick={() => setShow((prev) => !prev)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/60 transition-colors"
          aria-label={show ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
        >
          {show ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>
      {error && <p className="mt-1 text-xs text-[#f87171]">{error}</p>}
    </div>
  );
}
```

- [ ] **Step 2: Verify build**

```bash
npm run build
```

- [ ] **Step 3: Commit**

```bash
git add src/components/ui/PasswordInput.tsx
git commit -m "feat: apply dark theme to PasswordInput component"
```

---

## Task 5: Login page — atmospheric layout + dark LoginForm

**Files:**
- Modify: `src/app/(auth)/login/page.tsx`
- Modify: `src/app/(auth)/login/LoginForm.tsx`

- [ ] **Step 1: Replace `login/page.tsx` with atmospheric layout**

```tsx
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
```

- [ ] **Step 2: Replace `LoginForm.tsx` with dark form styling**

```tsx
'use client';

import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get('registered') === 'true';
  const justReset = searchParams.get('reset') === 'true';

  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setServerError(null);

    const result = await signIn('credentials', {
      email: data.email,
      password: data.password,
      redirect: false,
    });

    setIsLoading(false);

    if (result?.error) {
      setServerError('Invalid email or password');
      return;
    }

    router.push('/dashboard');
    router.refresh();
  };

  return (
    <>
      {justRegistered && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#4ade80]">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Account created. Please sign in.
        </div>
      )}

      {justReset && (
        <div className="mb-6 flex items-start gap-3 rounded-lg border border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.08)] px-4 py-3 text-sm text-[#4ade80]">
          <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          Password reset successfully. Please sign in with your new password.
        </div>
      )}

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
          {errors.email && <p className="mt-1 text-xs text-[#f87171]">{errors.email.message}</p>}
        </div>

        <div>
          <PasswordInput
            registration={register('password')}
            label="Password"
            placeholder="Your password"
            error={errors.password?.message}
          />
          <div className="mt-1.5 text-right">
            <Link href="/forgot-password" className="text-xs text-[#C49A3C] hover:text-[#E8B84B] transition-colors">
              Forgot password?
            </Link>
          </div>
        </div>

        {serverError && (
          <div className="flex items-start gap-3 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
            <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
          {isLoading ? 'Signing in…' : 'Sign In'}
        </button>
      </form>
    </>
  );
}
```

- [ ] **Step 3: Verify build and check visually**

```bash
npm run build && npm run dev
```

Open http://localhost:3000/login — should show dark bg with gold rings, glass card, gold logo, dark fields, gold button.

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/login/page.tsx src/app/\(auth\)/login/LoginForm.tsx
git commit -m "feat: redesign login page with atmospheric dark layout and dark form"
```

---

## Task 6: Register page — same atmospheric layout

**Files:**
- Modify: `src/app/(auth)/register/page.tsx`

- [ ] **Step 1: Replace outer layout and all form field styles**

The validation logic, `registerSchema`, `isValidIcDate`, `onSubmit`, and `useForm` setup all stay identical. Only the JSX layout and class names change:

```tsx
'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { PasswordInput } from '@/components/ui/PasswordInput';

const IC_REGEX = /^\d{6}-?\d{2}-?\d{4}$/;

function isValidIcDate(ic: string): boolean {
  const digits = ic.replace(/-/g, '');
  const mm = parseInt(digits.slice(2, 4), 10);
  const dd = parseInt(digits.slice(4, 6), 10);
  const yy = parseInt(digits.slice(0, 2), 10);
  const currentYY = new Date().getFullYear() % 100;
  const year = yy > currentYY ? 1900 + yy : 2000 + yy;
  const date = new Date(year, mm - 1, dd);
  return date.getFullYear() === year && date.getMonth() === mm - 1 && date.getDate() === dd;
}

const registerSchema = z
  .object({
    name: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
    role: z.enum(['LANDLORD', 'TENANT']),
    phone: z.string().optional(),
    icNumber: z
      .string()
      .min(1, 'IC number is required')
      .regex(IC_REGEX, 'Invalid format - e.g. 900101-14-5678')
      .refine(isValidIcDate, 'Invalid date in IC number'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

type RegisterFormData = z.infer<typeof registerSchema>;

// Shared input class
const INPUT = 'w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors';
const LABEL = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/40';

export default function RegisterPage() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: { role: 'TENANT' },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setServerError(null);

    try {
      const { confirmPassword: _, ...fields } = data;
      const formData = new FormData();
      Object.entries(fields).forEach(([key, value]) => {
        if (value !== undefined && value !== '') formData.append(key, value);
      });

      const response = await fetch('/api/register', { method: 'POST', body: formData });
      const result = await response.json();

      if (!response.ok) {
        setServerError(result.error || 'Registration failed');
        return;
      }

      router.push('/login?registered=true');
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
        <div className="absolute inset-20 rounded-full border border-[rgba(196,154,60,0.04)]" />
      </div>
      {/* Decorative gold rings — bottom left */}
      <div className="pointer-events-none absolute -bottom-16 -left-16">
        <div className="h-[300px] w-[300px] rounded-full border border-[rgba(196,154,60,0.06)]" />
        <div className="absolute inset-8 rounded-full bg-[rgba(196,154,60,0.02)]" />
      </div>

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-md rounded-2xl border border-[rgba(196,154,60,0.25)] bg-[rgba(28,39,64,0.75)] p-8 shadow-2xl backdrop-blur-md">
        {/* Logo */}
        <div className="mb-8 text-center">
          <p className="font-serif text-base font-bold tracking-[0.3em] text-[#C49A3C] uppercase">
            RentalEase
          </p>
          <div className="mx-auto mt-2 h-px w-10 bg-gradient-to-r from-transparent via-[#C49A3C] to-transparent" />
          <p className="mt-2 text-[10px] uppercase tracking-widest text-white/30">Malaysia</p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <label className={LABEL}>Full Name</label>
            <input
              {...register('name')}
              type="text"
              placeholder="e.g. Ahmad bin Abdullah"
              className={INPUT}
            />
            {errors.name && <p className="mt-1 text-xs text-[#f87171]">{errors.name.message}</p>}
          </div>

          <div>
            <label className={LABEL}>Email Address</label>
            <input
              {...register('email')}
              type="email"
              placeholder="you@example.com"
              className={INPUT}
            />
            {errors.email && <p className="mt-1 text-xs text-[#f87171]">{errors.email.message}</p>}
          </div>

          <div>
            <label className={LABEL}>
              Phone <span className="text-white/20 normal-case tracking-normal">(optional)</span>
            </label>
            <input
              {...register('phone')}
              type="tel"
              placeholder="e.g. 012-3456789"
              className={INPUT}
            />
          </div>

          <div>
            <label className={LABEL}>
              Malaysian IC Number <span className="text-[#f87171]">*</span>
            </label>
            {(() => {
              const { ref: icRef, onChange: icRhfOnChange, ...icRest } = register('icNumber');
              return (
                <input
                  {...icRest}
                  ref={icRef}
                  type="text"
                  placeholder="e.g. 900101-14-5678"
                  maxLength={14}
                  className={INPUT}
                  onChange={(e) => {
                    const el = e.target;
                    const cursor = el.selectionStart ?? el.value.length;
                    const digits = el.value.replace(/\D/g, '').slice(0, 12);
                    let formatted = digits;
                    if (digits.length > 6) formatted = digits.slice(0, 6) + '-' + digits.slice(6);
                    if (digits.length > 8) formatted = formatted.slice(0, 9) + '-' + digits.slice(8);
                    el.value = formatted;
                    requestAnimationFrame(() => el.setSelectionRange(cursor, cursor));
                    icRhfOnChange(e);
                  }}
                />
              );
            })()}
            {errors.icNumber ? (
              <p className="mt-1 text-xs text-[#f87171]">{errors.icNumber.message}</p>
            ) : (
              <p className="mt-1 text-xs text-white/25">Format: YYMMDD-SS-NNNN (dashes auto-added)</p>
            )}
          </div>

          <PasswordInput
            registration={register('password')}
            label="Password"
            placeholder="At least 8 characters"
            error={errors.password?.message}
          />
          <PasswordInput
            registration={register('confirmPassword')}
            label="Confirm Password"
            placeholder="Re-enter your password"
            error={errors.confirmPassword?.message}
          />

          <div>
            <label className={LABEL}>I am a…</label>
            <div className="grid grid-cols-2 gap-3">
              {(['TENANT', 'LANDLORD'] as const).map((r) => (
                <label key={r} className="relative flex cursor-pointer">
                  <input {...register('role')} type="radio" value={r} className="sr-only peer" />
                  <div className="w-full text-center py-2.5 rounded-lg border border-white/10 bg-white/5 text-sm font-medium text-white/40 peer-checked:border-[rgba(196,154,60,0.5)] peer-checked:text-[#C49A3C] peer-checked:bg-[rgba(196,154,60,0.08)] transition-all">
                    {r === 'TENANT' ? 'Tenant' : 'Landlord'}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {serverError && (
            <div className="flex items-start gap-3 rounded-lg border border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] px-4 py-3 text-sm text-[#f87171]">
              <svg className="mt-0.5 h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
            {isLoading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="mt-6 text-center text-sm text-white/40">
          Already have an account?{' '}
          <Link href="/login" className="text-[#C49A3C] hover:text-[#E8B84B] transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify build and check visually**

```bash
npm run build && npm run dev
```

Open http://localhost:3000/register — same gold rings + glass card layout. All form fields dark.

- [ ] **Step 3: Commit**

```bash
git add src/app/\(auth\)/register/page.tsx
git commit -m "feat: redesign register page with atmospheric dark layout"
```

---

## Task 7: Forgot-password and reset-password pages

**Files:**
- Modify: `src/app/(auth)/forgot-password/page.tsx`
- Modify: `src/app/(auth)/reset-password/page.tsx`

- [ ] **Step 1: Read current forgot-password page**

```bash
cat rentalease-malaysia/src/app/\(auth\)/forgot-password/page.tsx
```

- [ ] **Step 2: Wrap the page content with the atmospheric shell**

For both `forgot-password` and `reset-password`, replace the outer wrapper div with the rings + glass card layout. The inner form logic stays unchanged; only the outer container and form field classes change.

Apply these replacements to both files:

**Outer container** — replace any `min-h-screen flex items-center justify-center bg-white` (or similar) with:
```tsx
<div className="relative min-h-screen overflow-hidden bg-[#0f172a] flex items-center justify-center px-4 py-12">
  {/* Decorative rings */}
  <div className="pointer-events-none absolute -top-24 -right-24">
    <div className="h-[400px] w-[400px] rounded-full border border-[rgba(196,154,60,0.08)]" />
    <div className="absolute inset-10 rounded-full border border-[rgba(196,154,60,0.06)]" />
  </div>
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

    {/* existing form content here */}

  </div>
</div>
```

**Text/heading classes** — change any `text-gray-900` headings to `text-white`, `text-gray-500` descriptions to `text-white/50`.

**Input fields** — change to:
```
className="w-full rounded-lg border border-white/10 bg-white/5 px-3.5 py-2.5 text-sm text-white placeholder:text-white/20 focus:border-[rgba(196,154,60,0.5)] focus:outline-none focus:ring-0 transition-colors"
```

**Labels** — change to:
```
className="mb-1.5 block text-xs font-semibold uppercase tracking-[0.1em] text-white/40"
```

**Submit button** — change to:
```
className="w-full rounded-lg bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] py-2.5 text-sm font-bold text-[#1C2740] transition-opacity disabled:opacity-50 hover:opacity-90"
```

**Links** — change `text-blue-600` to `text-[#C49A3C] hover:text-[#E8B84B]`.

**Success/error banners** — apply the same pattern from LoginForm:
- Success: `border-[rgba(74,222,128,0.25)] bg-[rgba(74,222,128,0.08)] text-[#4ade80]`
- Error: `border-[rgba(248,113,113,0.25)] bg-[rgba(248,113,113,0.08)] text-[#f87171]`

- [ ] **Step 3: Verify build**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/app/\(auth\)/forgot-password/page.tsx src/app/\(auth\)/reset-password/page.tsx
git commit -m "feat: apply atmospheric dark layout to forgot/reset password pages"
```

---

## Task 8: Landlord dashboard inline overrides

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/page.tsx`

- [ ] **Step 1: Replace action buttons in PageHeader**

Find the action buttons block in `LandlordDashboard`. Replace:

```tsx
action={
  <div className="flex flex-wrap gap-2">
    {isVerified && (
      <>
        <Link
          href="/dashboard/landlord/properties/new"
          className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] px-4 py-2.5 text-sm font-bold text-[#1C2740] transition-opacity hover:opacity-90"
        >
          Add Property
        </Link>
        <Link
          href="/dashboard/landlord/tenancies/new"
          className="inline-flex items-center gap-2 rounded-lg border border-[rgba(196,154,60,0.25)] bg-[rgba(196,154,60,0.08)] px-4 py-2.5 text-sm font-semibold text-[#C49A3C] transition-colors hover:bg-[rgba(196,154,60,0.15)]"
        >
          Invite Tenant
        </Link>
      </>
    )}
    <Link
      href="/dashboard/landlord/payments"
      className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-semibold text-white/60 transition-colors hover:bg-white/10"
    >
      View Payments
    </Link>
  </div>
}
```

- [ ] **Step 2: Replace AttentionHero secondary slot**

Find the `secondary=` prop on `AttentionHero`. Replace:

```tsx
secondary={
  <div className="space-y-3">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#C49A3C]">Priority queue</p>
    <PriorityLink href="/dashboard/landlord/payments" label="Payment proofs" value={pendingPaymentVerifications} />
    <PriorityLink href="/dashboard/landlord/tenancies" label="Agreement reviews" value={pendingChangesRequested} />
    <PriorityLink href="/dashboard/landlord/properties" label="Condition reports" value={unacknowledgedConditionReports} />
  </div>
}
```

- [ ] **Step 3: Replace PriorityLink helper component**

```tsx
function PriorityLink({
  href,
  label,
  value,
}: {
  href: string;
  label: string;
  value: number;
}) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2 text-sm transition-colors hover:bg-white/8"
    >
      <span className="font-medium text-white/70">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          value > 0 ? 'bg-[#C49A3C] text-[#1C2740]' : 'bg-white/10 text-white/30'
        }`}
      >
        {value}
      </span>
    </Link>
  );
}
```

- [ ] **Step 4: Replace STATUS_PILL map and TenancyRow**

```tsx
const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';

const STATUS_PILL: Record<string, string> = {
  INVITED: `${PILL_BASE} bg-[rgba(250,204,21,0.12)] text-[#facc15] border border-[rgba(250,204,21,0.3)]`,
  PENDING: `${PILL_BASE} bg-[rgba(196,154,60,0.12)] text-[#C49A3C] border border-[rgba(196,154,60,0.3)]`,
  ACTIVE: `${PILL_BASE} bg-[rgba(74,222,128,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)]`,
  EXPIRED: `${PILL_BASE} bg-white/5 text-white/30 border border-white/10`,
  TERMINATED: `${PILL_BASE} bg-[rgba(248,113,113,0.12)] text-[#f87171] border border-[rgba(248,113,113,0.3)]`,
};

function TenancyRow({ tenancy }: { tenancy: ReturnType<typeof buildTenancyRow> }) {
  const hasProofToVerify = tenancy.rentPayments.length > 0;

  return (
    <div className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/5">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-white">{tenancy.tenant.name}</p>
        <p className="mt-0.5 truncate text-xs text-white/40">
          {tenancy.room.property.address}, {tenancy.room.property.city}
        </p>
      </div>
      <div className="ml-4 flex shrink-0 items-center gap-3">
        {hasProofToVerify && (
          <span className="inline-flex items-center rounded-full bg-[rgba(251,191,36,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#facc15] border border-[rgba(251,191,36,0.3)]">
            Proof to verify
          </span>
        )}
        <span className={STATUS_PILL[tenancy.status] ?? `${PILL_BASE} bg-white/5 text-white/30`}>
          {tenancy.status}
        </span>
        <Link href={`/dashboard/landlord/tenancies/${tenancy.id}`} className="text-xs text-[#C49A3C] hover:text-[#E8B84B]">
          View
        </Link>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace tenancy list inner wrapper and empty tenancy state**

Find `<div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">` (inside the SectionCard). Replace with a transparent container since `SectionCard` already provides the border/bg:

```tsx
<div className="divide-y divide-[rgba(255,255,255,0.05)]">
  {recentTenancies.map((tenancy) => (
    <TenancyRow key={tenancy.id} tenancy={tenancy} />
  ))}
</div>
```

Find the empty tenancy state `<div className="mb-8 rounded-xl border border-gray-200 bg-white p-12 text-center">`. Replace:

```tsx
<div className="mb-8 rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-12 text-center">
  <p className="text-sm text-white/40">
    No active tenancies yet.{' '}
    <Link href="/dashboard/landlord/tenancies/new" className="text-[#C49A3C] hover:text-[#E8B84B]">
      Invite a tenant
    </Link>{' '}
    to get started.
  </p>
</div>
```

- [ ] **Step 6: Replace property card grid**

Find the property cards inside the `SectionCard` for "Your properties". Replace each card's classes:

```tsx
<div
  key={property.id}
  className="overflow-hidden rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#0f172a] transition-colors hover:border-[rgba(196,154,60,0.3)]"
>
  <PropertyCover
    address={property.address}
    imageUrl={cover?.imageUrl}
    caption={cover?.caption}
    className="rounded-t-xl"
    heightClassName="h-36"
  />
  <div className="p-5">
    <p className="truncate text-sm font-semibold text-white">{property.address}</p>
    <p className="mt-0.5 text-xs text-white/40">
      {property.city}, {property.state}
    </p>
    <div className="mt-3 flex items-center gap-3 text-xs text-white/30">
      <span>{property.rooms.length} room{property.rooms.length !== 1 ? 's' : ''}</span>
      <span>&middot;</span>
      <span>{occupiedCount} occupied</span>
    </div>
    <Link
      href={`/dashboard/landlord/properties/${property.id}`}
      className="mt-3 inline-flex text-xs font-semibold text-[#C49A3C] hover:text-[#E8B84B]"
    >
      Manage &rarr;
    </Link>
  </div>
</div>
```

Also replace the "View all" link inside both `SectionCard` action props:

```tsx
action={
  <Link href="/dashboard/landlord/tenancies" className="text-sm font-medium text-[#C49A3C] hover:text-[#E8B84B]">
    View all
  </Link>
}
```

- [ ] **Step 7: Verify build and check visually**

```bash
npm run build && npm run dev
```

Open http://localhost:3000/dashboard/landlord — all stat cards, section cards, property cards should be navy/gold.

- [ ] **Step 8: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/landlord/page.tsx
git commit -m "feat: apply navy/gold theme to landlord dashboard inline components"
```

---

## Task 9: Tenant dashboard inline overrides

**Files:**
- Modify: `src/app/(dashboard)/dashboard/tenant/page.tsx`

- [ ] **Step 1: Replace QueueMetric helper**

```tsx
function QueueMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-lg bg-white/5 px-3 py-2">
      <span className="font-medium text-white/70">{label}</span>
      <span
        className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
          value > 0 ? 'bg-[#C49A3C] text-[#1C2740]' : 'bg-white/10 text-white/30'
        }`}
      >
        {value}
      </span>
    </div>
  );
}
```

- [ ] **Step 2: Replace AGREEMENT_PILL map**

```tsx
const AGREEMENT_PILL: Record<string, string> = {
  DRAFT: `${PILL_BASE} bg-white/5 text-white/30 border border-white/10`,
  FINALIZED: `${PILL_BASE} bg-[rgba(74,222,128,0.12)] text-[#4ade80] border border-[rgba(74,222,128,0.3)]`,
  NEGOTIATING: `${PILL_BASE} bg-[rgba(196,154,60,0.12)] text-[#C49A3C] border border-[rgba(196,154,60,0.3)]`,
  PENDING_TENANT: `${PILL_BASE} bg-[rgba(250,204,21,0.12)] text-[#facc15] border border-[rgba(250,204,21,0.3)]`,
};
```

Add `const PILL_BASE = 'inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium';` above it if not already present in the file.

- [ ] **Step 3: Replace pending tenancy row**

Find the inline div inside `SectionCard title="Pending invitations"`. Replace:

```tsx
<div className="divide-y divide-[rgba(255,255,255,0.05)]">
  {pendingTenancies.map((tenancy) => (
    <div key={tenancy.id} className="flex items-center justify-between px-5 py-3.5 transition-colors hover:bg-white/5">
      <div>
        <p className="text-sm font-medium text-white">{tenancy.room.property.address}</p>
        <p className="mt-0.5 text-xs text-white/40">
          {tenancy.room.property.city} &middot; {tenancy.room.label} &middot; Landlord: {tenancy.room.property.landlord.name}
        </p>
      </div>
      <div className="ml-4 flex items-center gap-2">
        <span className="inline-flex items-center rounded-full bg-[rgba(250,204,21,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#facc15] border border-[rgba(250,204,21,0.3)]">
          {tenancy.status}
        </span>
        <Link href="/dashboard/tenant/tenancy" className="text-xs text-[#C49A3C] hover:text-[#E8B84B]">
          View
        </Link>
      </div>
    </div>
  ))}
</div>
```

- [ ] **Step 4: Replace ActiveTenancyCard**

```tsx
function ActiveTenancyCard({ tenancy }: { tenancy: ActiveTenancyType }) {
  const agreementStatus = tenancy.agreement?.status;
  const cover = getPropertyCover(tenancy.room.property.photos ?? []);

  const nextPayment = tenancy.rentPayments
    .filter((p) => p.status === 'PENDING')
    .sort((a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime())[0];

  const hasRejectedPayment = tenancy.rentPayments.some(
    (p) => p.status === 'PENDING' && p.rejectionReason,
  );

  return (
    <div className="overflow-hidden rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-4">
      <div className="grid gap-5 sm:grid-cols-[13rem_1fr]">
        <PropertyCover
          address={tenancy.room.property.address}
          imageUrl={cover?.imageUrl}
          caption={cover?.caption}
          className="rounded-xl"
          heightClassName="h-36 sm:h-full"
        />
        <div className="min-w-0">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold text-white">{tenancy.room.property.address}</p>
              <p className="mt-0.5 text-sm text-white/50">
                {tenancy.room.property.city} &middot; {tenancy.room.label}
              </p>
              <p className="mt-0.5 text-xs text-white/30">
                Landlord: {tenancy.room.property.landlord.name}
              </p>
            </div>
            <Link href="/dashboard/tenant/tenancy" className="shrink-0 text-sm text-[#C49A3C] hover:text-[#E8B84B]">
              View details &rarr;
            </Link>
          </div>

          {agreementStatus && (
            <div className="mt-4 flex items-center gap-3">
              <span className="text-xs text-white/40">Agreement:</span>
              <span className={AGREEMENT_PILL[agreementStatus] ?? `${PILL_BASE} bg-white/5 text-white/30`}>
                {agreementStatus.replace('_', ' ')}
              </span>
              {agreementStatus === 'FINALIZED' && (
                <Link href="/dashboard/tenant/tenancy" className="text-xs font-medium text-[#C49A3C] hover:text-[#E8B84B]">
                  Review &amp; sign &rarr;
                </Link>
              )}
            </div>
          )}

          {nextPayment && (
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <span className="text-xs text-white/40">Next payment:</span>
              <span className="text-xs font-medium text-white">
                RM {Number(nextPayment.amount).toLocaleString('en-MY', { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs text-white/30">
                due {new Date(nextPayment.dueDate).toLocaleDateString('en-MY')}
              </span>
              {hasRejectedPayment && (
                <span className="inline-flex items-center rounded-full bg-[rgba(248,113,113,0.12)] px-2.5 py-0.5 text-xs font-medium text-[#f87171] border border-[rgba(248,113,113,0.3)]">
                  Proof rejected
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Replace "Active tenancies" section heading and empty state**

Find `<h2 className="mb-4 text-lg font-semibold text-gray-900">Active tenancies</h2>`. Replace:

```tsx
<h2 className="mb-4 font-serif text-lg font-semibold text-white">Active tenancies</h2>
```

Find the empty state div `<div className="rounded-xl border border-gray-200 bg-white p-12 text-center">`. Replace:

```tsx
<div className="rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-12 text-center">
  <p className="text-sm text-white/40">
    You don&apos;t have any tenancies yet. Your landlord will send you an invitation when they list a room for you.
  </p>
</div>
```

Also replace the `AttentionHero` secondary slot:

```tsx
secondary={
  <div className="space-y-2 text-sm">
    <p className="text-xs font-semibold uppercase tracking-wide text-[#C49A3C]">Current queue</p>
    <QueueMetric label="Pending invitations" value={pendingTenancies.length} />
    <QueueMetric label="Agreement reviews" value={pendingAgreementReviews} />
    <QueueMetric label="Payment follow-ups" value={rejectedPayments} />
    <QueueMetric label="Condition reports" value={unacknowledgedConditionReports} />
  </div>
}
```

- [ ] **Step 6: Verify build and check visually**

```bash
npm run build && npm run dev
```

Open http://localhost:3000/dashboard/tenant.

- [ ] **Step 7: Commit**

```bash
git add src/app/\(dashboard\)/dashboard/tenant/page.tsx
git commit -m "feat: apply navy/gold theme to tenant dashboard inline components"
```

---

## Task 10: List pages — properties, tenancies, payments

**Files:**
- Modify: `src/app/(dashboard)/dashboard/landlord/properties/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/tenancies/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/landlord/payments/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/payments/page.tsx`
- Modify: `src/app/(dashboard)/dashboard/tenant/tenancy/page.tsx`

> **Pattern:** `PageHeader`, `StatCard`, `SectionCard`, `EmptyState` are already updated by Task 3. This task only fixes hardcoded inline colours that remain.

- [ ] **Step 1: Read each file and apply the substitution table below**

Open each file and apply these global substitutions (use find & replace — each is safe to apply globally within these files):

| Find | Replace |
|---|---|
| `bg-white` (on cards/divs, not body) | `bg-[#1C2740]` |
| `border-gray-200` | `border-[rgba(196,154,60,0.15)]` |
| `border-gray-100` | `border-[rgba(196,154,60,0.12)]` |
| `text-gray-900` | `text-white` |
| `text-gray-700` | `text-white/70` |
| `text-gray-600` | `text-white/60` |
| `text-gray-500` | `text-white/50` |
| `text-gray-400` | `text-white/40` |
| `text-gray-300` | `text-white/30` |
| `text-blue-600` | `text-[#C49A3C]` |
| `hover:text-blue-600` | `hover:text-[#E8B84B]` |
| `bg-blue-600` | `bg-gradient-to-br from-[#C49A3C] to-[#E8B84B]` |
| `hover:bg-gray-50` | `hover:bg-white/5` |
| `hover:bg-blue-100` | `hover:bg-[rgba(196,154,60,0.1)]` |
| `divide-gray-100` | `divide-[rgba(255,255,255,0.05)]` |
| `bg-amber-50 border-amber-200 text-amber-800` | `bg-[rgba(251,191,36,0.08)] border-[rgba(251,191,36,0.25)] text-[#facc15]` |
| `text-amber-700` | `text-[#facc15]/80` |
| `bg-green-50 text-green-700 ring-green-200` | `bg-[rgba(74,222,128,0.12)] text-[#4ade80] ring-[rgba(74,222,128,0.3)]` |
| `bg-yellow-50 text-yellow-700 ring-yellow-200` | `bg-[rgba(250,204,21,0.12)] text-[#facc15] ring-[rgba(250,204,21,0.3)]` |
| `bg-red-50 text-red-600 ring-red-200` | `bg-[rgba(248,113,113,0.12)] text-[#f87171] ring-[rgba(248,113,113,0.3)]` |
| `bg-emerald-50 text-emerald-700 ring-emerald-200` | `bg-[rgba(74,222,128,0.12)] text-[#4ade80] ring-[rgba(74,222,128,0.3)]` |
| `bg-purple-50 text-purple-700 ring-purple-200` | `bg-[rgba(196,154,60,0.12)] text-[#C49A3C] ring-[rgba(196,154,60,0.3)]` |
| `bg-gray-100 text-gray-500` (on badges) | `bg-white/8 text-white/30` |

After substitutions, scan each file for any remaining light-mode colours and replace with appropriate dark equivalents.

- [ ] **Step 2: Verify build**

```bash
npm run build
```

Fix any TypeScript errors (usually none — these are class string changes only).

- [ ] **Step 3: Visual verification**

```bash
npm run dev
```

Visit each page and confirm no white boxes, no blue text, no gray backgrounds remain:
- http://localhost:3000/dashboard/landlord/properties
- http://localhost:3000/dashboard/landlord/tenancies
- http://localhost:3000/dashboard/landlord/payments
- http://localhost:3000/dashboard/tenant/payments
- http://localhost:3000/dashboard/tenant/tenancy

- [ ] **Step 4: Commit**

```bash
git add \
  src/app/\(dashboard\)/dashboard/landlord/properties/page.tsx \
  src/app/\(dashboard\)/dashboard/landlord/tenancies/page.tsx \
  src/app/\(dashboard\)/dashboard/landlord/payments/page.tsx \
  src/app/\(dashboard\)/dashboard/tenant/payments/page.tsx \
  src/app/\(dashboard\)/dashboard/tenant/tenancy/page.tsx
git commit -m "feat: apply navy/gold theme to list and detail pages"
```

---

## Self-Review Checklist

- [x] **Spec coverage:** DashboardShell ✓, Sidebar ✓, RedesignPrimitives (all 5) ✓, PasswordInput ✓, Login ✓, Register ✓, Forgot/Reset password ✓, Landlord dashboard ✓, Tenant dashboard ✓, Properties ✓, Tenancies ✓, Payments ✓, Tenant tenancy ✓
- [x] **No placeholders:** All steps include exact class strings or full component code
- [x] **Type consistency:** No renamed methods across tasks — class-only changes throughout
- [x] **Ambiguity:** Task 10 substitution table is explicit for every colour token
