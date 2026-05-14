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
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.16em] text-gray-400">
            {eyebrow}
          </p>
        )}
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">{title}</h1>
        {description && <p className="mt-1 text-sm text-gray-500">{description}</p>}
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
    <section className="mb-6 rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="grid gap-4 lg:grid-cols-[1.4fr_0.8fr] lg:items-center">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-600">Today</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-gray-900">{title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-gray-500">{description}</p>
          <Link
            href={href}
            className="mt-4 inline-flex rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
          >
            {actionLabel}
          </Link>
        </div>
        {secondary && (
          <div className="rounded-xl border border-blue-100 bg-blue-50 p-4">{secondary}</div>
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
  default: 'text-gray-900',
  blue: 'text-blue-600',
  green: 'text-green-600',
  amber: 'text-amber-600',
  red: 'text-red-600',
};

export function StatCard({ label, value, detail, tone = 'default' }: StatCardProps) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`mt-2 truncate text-2xl font-bold ${toneText[tone]}`}>{value}</p>
      {detail && <p className="mt-1 text-xs text-gray-400">{detail}</p>}
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
    <section className={`rounded-xl border border-gray-200 bg-white${className ? ` ${className}` : ''}`}>
      <div className="flex items-center justify-between gap-3 border-b border-gray-100 px-5 py-4">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
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
    <div className="rounded-xl border border-gray-200 bg-white p-12 text-center">
      <p className="text-base font-semibold text-gray-700">{title}</p>
      <p className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-gray-400">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
