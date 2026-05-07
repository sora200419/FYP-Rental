# RentalEase UI/UX Design Specification

## 1. Design Principles

- **Dark sidebar, light canvas** — `bg-gray-900` sidebar, `bg-gray-50` main content area, `bg-white` cards.
- **One accent** — `blue-600` (`#2563eb`) for all primary actions, active states, and highlights. No secondary accents.
- **No gradients** — flat colours only. No `from-*`, `to-*`, `via-*`, or `bg-gradient-*` classes anywhere.
- **No shadows on nav/sidebar** — borders (`border-gray-200`, `border-gray-800`) define separation; only cards may have `shadow-sm`.
- **Consistent radius** — cards and inputs use `rounded-xl`; pills use `rounded-full`; buttons use `rounded-lg`; tabs use no radius.
- **Micro-motion only** — `transition-colors` on interactive elements. Nothing else animated.

---

## 2. Color Tokens (globals.css CSS variables)

```css
:root {
  /* Canvas */
  --app-bg:       #f9fafb;   /* gray-50  */
  --card-bg:      #ffffff;

  /* Sidebar */
  --sidebar-bg:   #111827;   /* gray-900 */
  --sidebar-border:#1f2937;  /* gray-800 */

  /* Accent */
  --accent:       #2563eb;   /* blue-600 */
  --accent-hover: #1d4ed8;   /* blue-700 */

  /* Text */
  --text-primary:   #111827; /* gray-900 */
  --text-secondary: #6b7280; /* gray-500 */
  --text-muted:     #9ca3af; /* gray-400 */

  /* Borders */
  --border:       #e5e7eb;   /* gray-200 */
  --border-light: #f3f4f6;   /* gray-100 */
}
```

---

## 3. Typography

| Role           | Classes                                         |
|----------------|-------------------------------------------------|
| Page title     | `text-2xl font-bold text-gray-900`              |
| Section title  | `text-lg font-semibold text-gray-900`           |
| Card title     | `text-base font-semibold text-gray-900`         |
| Body default   | `text-sm text-gray-700`                         |
| Body secondary | `text-sm text-gray-500`                         |
| Caption        | `text-xs text-gray-400`                         |
| Sidebar link   | `text-sm font-medium text-gray-300`             |
| Sidebar active | `text-sm font-medium text-white`                |
| Label          | `block text-sm font-medium text-gray-700 mb-1.5`|
| Error text     | `text-xs text-red-500 mt-1`                     |

Font family: `Inter` (Google Fonts, `subsets: ['latin']`).

---

## 4. Spacing, Radius & Shadow Reference

| Element           | Padding         | Radius       | Shadow    |
|-------------------|-----------------|--------------|-----------|
| Page content area | `p-6 lg:p-8`   | —            | —         |
| Card              | `p-5`           | `rounded-xl` | none or `shadow-sm` |
| Card (inner sect.)| `px-5 py-4`    | —            | —         |
| Button (default)  | `px-4 py-2.5`  | `rounded-lg` | —         |
| Button (sm)       | `px-3 py-1.5`  | `rounded-lg` | —         |
| Input             | `px-3.5 py-2.5`| `rounded-lg` | — (focus ring only) |
| Status pill       | `px-2.5 py-0.5`| `rounded-full`| —        |
| Banner            | `px-4 py-3`    | `rounded-lg` | —         |
| Sidebar link      | `px-3 py-2.5`  | `rounded-lg` | —         |
| Sidebar header    | `h-16 px-5`    | —            | —         |
| Top header bar    | `h-14 px-6`    | —            | —         |
| Stat card value   | `text-3xl`     | —            | —         |

---

## 5. Sidebar Component

File: `src/components/ui/Sidebar.tsx`

```jsx
<aside className="w-60 min-h-screen bg-gray-900 flex flex-col shrink-0 sticky top-0 h-screen overflow-y-auto">
  {/* Logo */}
  <div className="h-16 flex items-center px-5 border-b border-gray-800 shrink-0">
    <span className="text-white font-bold text-lg tracking-tight">RentalEase</span>
  </div>

  {/* Nav section label */}
  <p className="px-5 pt-5 pb-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
    Navigation
  </p>

  {/* Nav links */}
  <nav className="flex-1 px-3 pb-4 space-y-0.5 overflow-y-auto">
    {/* Inactive link */}
    <Link className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white transition-colors">
      <Icon className="w-4 h-4 shrink-0 text-gray-400" />
      Label
    </Link>

    {/* Active link */}
    <Link className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium bg-blue-600 text-white">
      <Icon className="w-4 h-4 shrink-0 text-blue-200" />
      Label
    </Link>
  </nav>

  {/* Bottom section — language + user */}
  <div className="border-t border-gray-800 p-3 space-y-1 shrink-0">
    {/* Language toggle */}
    <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-400 hover:bg-gray-800 hover:text-white transition-colors">
      <GlobeIcon className="w-4 h-4 shrink-0" />
      EN / MS
    </button>
    {/* User row */}
    <div className="flex items-center gap-3 px-3 py-2.5">
      <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold shrink-0">
        A
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white truncate">Name</p>
        <p className="text-xs text-gray-400 capitalize truncate">role</p>
      </div>
    </div>
    {/* Sign out */}
    <button className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors">
      <LogOutIcon className="w-4 h-4 shrink-0" />
      Sign out
    </button>
  </div>
</aside>
```

Mobile: sidebar hidden (`hidden lg:flex`), hamburger button in top bar opens a drawer overlay (`fixed inset-0 z-40`, sidebar slides in from left with `translate-x-0`).

---

## 6. Dashboard Layout

File: `src/app/(dashboard)/layout.tsx`

```jsx
<div className="flex h-screen overflow-hidden bg-gray-50">
  <Sidebar />  {/* hidden on mobile */}

  {/* Mobile overlay drawer */}
  {mobileOpen && (
    <div className="fixed inset-0 z-40 lg:hidden">
      <div className="absolute inset-0 bg-black/50" onClick={close} />
      <Sidebar className="relative z-50" />
    </div>
  )}

  {/* Main column */}
  <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
    {/* Top bar */}
    <header className="h-14 bg-white border-b border-gray-200 flex items-center px-6 gap-4 shrink-0 sticky top-0 z-20">
      {/* Mobile hamburger (lg:hidden) */}
      <button className="lg:hidden p-1.5 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
        <MenuIcon className="w-5 h-5" />
      </button>
      <div className="flex-1" />
      {/* Notification bell — not for ADMIN */}
      {/* User name (sm+) */}
    </header>

    {/* Page content */}
    <main className="flex-1 p-6 lg:p-8">
      {/* KYC banner if needed */}
      {children}
    </main>
  </div>
</div>
```

---

## 7. Auth Pages — Split-Panel Layout

Files: `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx`

```jsx
<div className="min-h-screen flex">
  {/* Left panel — branding, hidden on mobile */}
  <div className="hidden lg:flex w-5/12 bg-gray-900 flex-col items-center justify-center p-12">
    <span className="text-4xl font-bold text-white tracking-tight">RentalEase</span>
    <p className="text-gray-400 mt-3 text-center text-sm leading-relaxed max-w-xs">
      AI-Assisted Digital Tenancy Platform for Malaysian Residential Rentals
    </p>
    <ul className="mt-10 space-y-3 text-sm text-gray-400 max-w-xs w-full">
      <li className="flex items-center gap-2">
        <CheckIcon className="w-4 h-4 text-blue-500 shrink-0" /> AI agreement generation
      </li>
      <li className="flex items-center gap-2">
        <CheckIcon className="w-4 h-4 text-blue-500 shrink-0" /> Blockchain-verified contracts
      </li>
      <li className="flex items-center gap-2">
        <CheckIcon className="w-4 h-4 text-blue-500 shrink-0" /> Bilingual EN / BM support
      </li>
    </ul>
  </div>

  {/* Right panel — form */}
  <div className="flex-1 flex items-center justify-center bg-white px-6 py-12">
    <div className="w-full max-w-sm">
      <h2 className="text-2xl font-bold text-gray-900 mb-1">Sign in</h2>
      <p className="text-sm text-gray-500 mb-8">Welcome back to RentalEase</p>
      {/* form */}
    </div>
  </div>
</div>
```

---

## 8. Buttons

```
Primary:   bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium text-sm px-4 py-2.5 rounded-lg transition-colors
Secondary: border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors
Danger:    border border-red-200 bg-white hover:bg-red-50 text-red-600 font-medium text-sm px-4 py-2.5 rounded-lg transition-colors
Ghost:     text-blue-600 hover:underline text-sm font-medium (no border/bg)
Small:     (above classes but) px-3 py-1.5 text-xs
Icon-only: p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors
```

---

## 9. Inputs & Forms

```
Text input:  w-full border border-gray-300 rounded-lg px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow
Textarea:    (same) + resize-none min-h-[80px]
Select:      (same) + appearance-none bg-white
Label:       block text-sm font-medium text-gray-700 mb-1.5
Helper text: text-xs text-gray-500 mt-1
Error text:  text-xs text-red-500 mt-1
Form group:  space-y-5
```

---

## 10. Cards

```
Base card:     bg-white rounded-xl border border-gray-200 p-5
Hover card:    bg-white rounded-xl border border-gray-200 p-5 hover:border-gray-300 transition-colors cursor-pointer
Elevated card: bg-white rounded-xl border border-gray-200 shadow-sm p-5
Divider list:  bg-white rounded-xl border border-gray-200 divide-y divide-gray-100
  List row:    flex items-center justify-between px-5 py-3.5 hover:bg-gray-50 transition-colors
Empty state:   bg-white rounded-xl border border-gray-200 p-12 text-center
  Empty text:  text-sm text-gray-400
```

---

## 11. Status Pill Color Map (all 14 states)

Pill base: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium`

| Status            | Classes (appended to base)                          |
|-------------------|-----------------------------------------------------|
| INVITED           | `bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset` |
| PENDING           | `bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`     |
| ACTIVE            | `bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`  |
| EXPIRED           | `bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`    |
| TERMINATED        | `bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`        |
| DRAFT             | `bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`    |
| PENDING_TENANT    | `bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200 ring-inset` |
| PENDING_LANDLORD  | `bg-orange-50 text-orange-700 ring-1 ring-orange-200 ring-inset` |
| NEGOTIATING       | `bg-purple-50 text-purple-700 ring-1 ring-purple-200 ring-inset` |
| FINALIZED         | `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset` |
| PAID              | `bg-green-50 text-green-700 ring-1 ring-green-200 ring-inset`  |
| UNDER_REVIEW      | `bg-blue-50 text-blue-700 ring-1 ring-blue-200 ring-inset`     |
| PROPOSED          | `bg-gray-100 text-gray-500 ring-1 ring-gray-200 ring-inset`    |
| COMPLETED         | `bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 ring-inset` |

Late (computed): `bg-red-50 text-red-600 ring-1 ring-red-200 ring-inset`

---

## 12. Banners

```jsx
/* Wrapper */
<div className="space-y-2 mb-6">

/* Blue (info) */
<div className="flex items-start gap-3 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-sm text-blue-800 font-medium">
  <InfoIcon className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
  <span>{text}</span>
</div>

/* Amber (warning) */
<div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-800 font-medium">
  <WarningIcon className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
  <span>{text}</span>
</div>

/* Red (error) */
<div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800 font-medium">
  <ErrorIcon className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
  <span>{text}</span>
</div>
```

---

## 13. Tabs

```jsx
/* Tab bar */
<div className="flex border-b border-gray-200 gap-0 mb-6">

  {/* Inactive tab */}
  <button className="px-4 py-2.5 text-sm font-medium text-gray-500 border-b-2 border-transparent hover:text-gray-700 hover:border-gray-300 transition-colors -mb-px">
    Tab Label
  </button>

  {/* Active tab */}
  <button className="px-4 py-2.5 text-sm font-medium text-blue-600 border-b-2 border-blue-600 -mb-px">
    Tab Label
  </button>
</div>
```

---

## 14. Chat Bubbles

```jsx
/* Message group */
<div className="flex flex-col gap-3 p-4">

  {/* Sent (current user) */}
  <div className="flex justify-end">
    <div className="bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2.5 max-w-xs lg:max-w-sm text-sm">
      {message}
      <p className="text-[10px] text-blue-200 mt-1 text-right">{time}</p>
    </div>
  </div>

  {/* Received */}
  <div className="flex items-end gap-2">
    <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
      {initial}
    </div>
    <div className="bg-white border border-gray-200 text-gray-900 rounded-2xl rounded-bl-sm px-4 py-2.5 max-w-xs lg:max-w-sm text-sm shadow-sm">
      {message}
      <p className="text-[10px] text-gray-400 mt-1">{time}</p>
    </div>
  </div>
</div>
```

---

## 15. Audit / History Rows

```jsx
<div className="divide-y divide-gray-100">
  <div className="flex items-start gap-3 py-3.5 px-5">
    {/* Icon dot */}
    <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center shrink-0 mt-0.5">
      <Icon className="w-3.5 h-3.5 text-gray-500" />
    </div>
    {/* Content */}
    <div className="flex-1 min-w-0">
      <p className="text-sm text-gray-900 font-medium">{action}</p>
      <p className="text-xs text-gray-500 mt-0.5">{actor}</p>
    </div>
    {/* Timestamp */}
    <time className="text-xs text-gray-400 shrink-0 mt-0.5">{date}</time>
  </div>
</div>
```

---

## 16. Dashboard Stat Cards

```jsx
/* Grid */
<div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">

  {/* Base stat card */}
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-3xl font-bold text-gray-900 mt-2">{value}</p>
    {/* Optional: trend chip */}
    <p className="text-xs text-gray-400 mt-1">{sublabel}</p>
  </div>

  {/* Accent stat card (for attention values) */}
  <div className="bg-white rounded-xl border border-gray-200 p-5">
    <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">{label}</p>
    <p className="text-3xl font-bold text-blue-600 mt-2">{value}</p>
  </div>
</div>
```

---

## 17. Key Files Map

| SPEC Section           | Files to change                                                  |
|------------------------|------------------------------------------------------------------|
| §5 Sidebar             | `src/components/ui/Sidebar.tsx` (new), `src/components/ui/TopNav.tsx` (keep for ref then delete) |
| §6 Dashboard layout    | `src/app/(dashboard)/layout.tsx`                                 |
| §7 Auth pages          | `src/app/(auth)/login/page.tsx`, `src/app/(auth)/register/page.tsx` |
| §8 Buttons             | All pages + components                                           |
| §9 Inputs              | `src/app/(auth)/register/page.tsx`, `src/components/ui/ProfileForm.tsx`, form components |
| §10 Cards              | All dashboard pages                                              |
| §11 Status pills       | `src/app/(dashboard)/dashboard/landlord/page.tsx`, tenancy detail, payments pages |
| §12 Banners            | `src/components/ui/DashboardBanners.tsx`, `src/components/ui/KycPendingBanner.tsx` |
| §13 Tabs               | Agreement viewer, tenancy detail pages                           |
| §14 Chat bubbles       | `src/components/ui/LandlordMessagesClient.tsx`, `src/components/ui/MessageThread.tsx` |
| §15 Audit rows         | Agreement viewer audit log section                               |
| §16 Stat cards         | `src/app/(dashboard)/dashboard/landlord/page.tsx`, tenant/admin dashboards |

---

## 18. Pre-Flight Checklist for Claude Code

- [ ] Never touch API routes (`src/app/api/**`)
- [ ] Never touch auth logic (`src/lib/auth.ts`, `src/middleware.ts`)
- [ ] Never touch database schema (`prisma/schema.prisma`)
- [ ] Never touch business logic (`src/lib/*.ts`, except `i18n.ts` translations)
- [ ] Never add gradients (no `bg-gradient-*`, `from-*`, `to-*`)
- [ ] Only one accent: `blue-600` / `blue-700` for hover
- [ ] Sidebar is dark (`bg-gray-900`), everything else is light
- [ ] Confirm `npm run build` passes after each phase before continuing
- [ ] Status pill shape: `rounded-full` + `ring-1 ring-inset`
- [ ] No emoji in production UI elements (text only or heroicons SVG)
