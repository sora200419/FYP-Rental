# RentalEase UI Redesign — Design Spec

**Date:** 2026-05-17
**Scope:** Auth pages, TopNav, shared primitives, Landlord/Tenant dashboards, Properties listing, Tenancy detail, Payments page

---

## Goals

Extend the AgreementViewer's premium design language (dark navy, gold, serif typography) across the entire app so users experience one consistent visual identity from login to document signing. Currently the dashboard uses a disconnected blue/white aesthetic (`RedesignPrimitives.tsx`) while the AgreementViewer uses `#1C2740` + `#C49A3C`. This spec eliminates that split.

---

## Design System

### Color Palette

| Token | Value | Usage |
|---|---|---|
| Page background | `#0f172a` | Outermost page bg |
| Surface | `#1C2740` | Cards, nav, modals |
| Gold | `#C49A3C` | Labels, active states, borders |
| Gold light | `#E8B84B` | Gradient end, hover accents |
| Text primary | `rgba(255,255,255,1)` | Headings, stat values |
| Text body | `rgba(255,255,255,0.55)` | Body text, descriptions |
| Text muted | `rgba(255,255,255,0.30)` | Secondary labels, timestamps |
| Card border | `rgba(196,154,60,0.20)` | All card/surface borders |
| Card border hover | `rgba(196,154,60,0.35)` | Hover/active border |
| Row stripe | `rgba(255,255,255,0.03)` | Alternating table rows |
| Row hover | `rgba(196,154,60,0.06)` | Table row hover tint |
| Divider | `rgba(196,154,60,0.12)` | Section dividers within cards |

### Typography

| Role | Font | Size / Style |
|---|---|---|
| Brand logo | Cormorant Garamond (serif) | `font-serif`, letter-spacing wide |
| Page heading (H1) | Cormorant Garamond (serif) | `text-2xl font-bold` |
| Section heading (H2) | System sans (Outfit) | `text-base font-semibold` |
| Eyebrow label | System sans | `text-xs uppercase tracking-widest text-gold` |
| Stat value | Cormorant Garamond (serif) | `text-3xl` |
| Body / UI text | System sans | `text-sm` |
| Table columns headers | System sans | `text-xs uppercase tracking-wider text-gold` |

Cormorant Garamond is already loaded by the AgreementViewer — no new font imports needed.

### Status Badges

All badges use `rounded-full px-2.5 py-0.5 text-xs border`:

| Status | Text colour | Border / bg |
|---|---|---|
| Active | `#4ade80` | `rgba(74,222,128,0.12)` / `rgba(74,222,128,0.3)` |
| Pending / Invited | `#facc15` | `rgba(250,204,21,0.12)` / `rgba(250,204,21,0.3)` |
| Terminated / Expired | `#f87171` | `rgba(248,113,113,0.12)` / `rgba(248,113,113,0.3)` |
| Vacant / None | `rgba(255,255,255,0.4)` | `rgba(255,255,255,0.06)` / `rgba(255,255,255,0.12)` |
| Finalized | `#C49A3C` | `rgba(196,154,60,0.12)` / `rgba(196,154,60,0.3)` |

### Buttons

| Variant | Style |
|---|---|
| Primary | `bg-gradient-to-br from-[#C49A3C] to-[#E8B84B] text-[#1C2740] font-bold` |
| Secondary (gold outline) | `bg-[rgba(196,154,60,0.1)] border border-[rgba(196,154,60,0.25)] text-[#C49A3C]` |
| Ghost | `bg-[rgba(255,255,255,0.04)] border border-[rgba(255,255,255,0.08)] text-white/50` |

---

## Implementation Approach

**Shared-component-first.** Update `TopNav.tsx` and `RedesignPrimitives.tsx` first — every dashboard page that already imports these components gets the new theme automatically. Auth pages are rewritten from scratch with a new layout. Per-page changes are minimal overrides only.

**File change order:**
1. `TopNav.tsx` — navy background, gold logo, gold active pill, dark icon buttons
2. `RedesignPrimitives.tsx` — all five primitives updated to navy/gold tokens
3. `src/app/(auth)/login/page.tsx` — new atmospheric dark layout
4. `src/app/(auth)/register/page.tsx` — same layout, register form
5. Per-page table styling — Properties, Payments, Tenancies list pages
6. Tenancy detail page — section cards already covered by primitives update

---

## Component Specs

### TopNav (`src/components/ui/TopNav.tsx`)

- **Background:** `bg-[#1C2740] border-b border-[rgba(196,154,60,0.15)]`
- **Logo:** `font-serif text-[#C49A3C] tracking-widest text-sm uppercase`
- **Nav link (inactive):** `text-white/50 hover:text-white/80 hover:bg-white/5`
- **Nav link (active):** `text-[#C49A3C] bg-[rgba(196,154,60,0.1)] border border-[rgba(196,154,60,0.2)]`
- **Icon buttons (message/bell):** `rounded-full bg-white/5 hover:bg-white/10 text-white/50`
- **Unread badge:** `bg-[#C49A3C] text-[#1C2740] border-[1.5px] border-[#1C2740]`
- **User menu trigger:** `bg-white/5 border border-[rgba(196,154,60,0.2)] rounded-lg`
- **User avatar initial:** `bg-[#C49A3C] text-[#1C2740] font-bold`
- **Dropdown:** `bg-[#1C2740] border border-[rgba(196,154,60,0.2)] shadow-xl`

### PageHeader (`RedesignPrimitives.tsx`)

- Eyebrow: `text-xs font-semibold uppercase tracking-[0.2em] text-[#C49A3C]`
- Title: `font-serif text-2xl font-bold text-white`
- Description: `text-sm text-white/50`
- Action button: primary button variant (gold gradient)

### StatCard (`RedesignPrimitives.tsx`)

- Wrapper: `rounded-xl border border-[rgba(196,154,60,0.2)] bg-[#1C2740] p-5`
- Label: `text-xs font-semibold uppercase tracking-wide text-white/35`
- Value: `font-serif text-3xl` — white by default, gold for key metrics (active tenancies, rent), light gold for financial values
- Detail: `text-xs text-white/30`
- Tone mapping (replaces existing blue/green/amber/red): `default` → `text-white`, `blue` → `text-[#C49A3C]` (gold, for counts), `green` → `text-[#4ade80]`, `amber` → `text-[#E8B84B]` (light gold, for money), `red` → `text-[#f87171]`

### SectionCard (`RedesignPrimitives.tsx`)

- Wrapper: `rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740]`
- Header: `flex items-center justify-between gap-3 border-b border-[rgba(196,154,60,0.12)] px-5 py-4`
- Title: `text-base font-semibold text-white`
- Body: `p-5`

### AttentionHero (`RedesignPrimitives.tsx`)

- Wrapper: `rounded-2xl border border-[rgba(196,154,60,0.3)] bg-gradient-to-br from-[rgba(196,154,60,0.12)] to-[rgba(196,154,60,0.04)] p-5`
- Eyebrow: `text-xs font-semibold uppercase tracking-widest text-[#C49A3C]`
- Title: `font-serif text-xl font-bold text-white`
- Description: `text-sm text-white/50`
- CTA button: primary variant (gold gradient)

### EmptyState (`RedesignPrimitives.tsx`)

- Wrapper: `rounded-xl border border-[rgba(196,154,60,0.15)] bg-[#1C2740] p-12 text-center`
- Title: `text-base font-semibold text-white`
- Description: `text-sm text-white/40`

---

## Page Specs

### Auth Pages — Login & Register

**Layout:** Full-screen `#0f172a` background. Centred glass card. Decorative gold rings positioned absolutely (top-right, bottom-left) at 12% and 8% opacity.

**Glass card:**
- `bg-[rgba(28,39,64,0.7)] border border-[rgba(196,154,60,0.25)] rounded-2xl p-8 backdrop-blur-md w-full max-w-sm`
- Logo block: serif `#C49A3C` text, gold hairline divider, "MALAYSIA" muted subtext
- Field labels: `text-xs uppercase tracking-widest text-white/40`
- Input fields: `bg-white/5 border border-white/10 rounded-lg text-white/80 placeholder:text-white/20`
- Focus ring: `focus:border-[rgba(196,154,60,0.5)] focus:ring-0`
- Sign in / Register button: primary gradient gold
- Toggle link (login ↔ register): `text-[#C49A3C]`

### Landlord Dashboard

- `PageHeader` with eyebrow "LANDLORD DASHBOARD", title "Good morning, {name}", description with property count
- `AttentionHero` rendered only when a pending agreement, overdue payment, or expiring tenancy exists
- 4-column `StatCard` grid: Properties, Active Tenancies (gold value), Rent Due (light gold value), Unread Messages
- 2-column bottom: `SectionCard` for Recent Activity (dot-list), `SectionCard` for Quick Actions (gold outline buttons)

### Tenant Dashboard

- `PageHeader` with eyebrow "TENANT DASHBOARD", title "Hello, {name}"
- `AttentionHero` when agreement awaits signing or rent is due
- 3-column `StatCard` grid: Tenancy Status, Next Rent Due (gold), Days Until Expiry
- `SectionCard` for recent payment history (table)

### Properties Listing

- `PageHeader` with "+ Add Property" primary button as action
- Full-width `SectionCard` wrapping a dark table:
  - Header row: `border-b border-[rgba(196,154,60,0.2)]`, gold uppercase column labels
  - Odd rows: `bg-[rgba(255,255,255,0.03)]`
  - Even rows: no background (transparent)
  - Hover row: `bg-[rgba(196,154,60,0.06)] border-y border-[rgba(196,154,60,0.1)]`
  - Columns: Property name + subtitle (tenant, lease end), Status badge, Rent/mo in serif, "View →" in gold

### Tenancy Detail Page

- `PageHeader` with property name as title
- Grid of `SectionCard` panels: Tenancy Info, Agreement Status + actions, Rent History table, Condition Reports

### Payments Page (Landlord & Tenant)

- `PageHeader` with period filter or export button as action
- Full-width `SectionCard` wrapping a dark table:
  - Columns: Date, Property / Tenant, Amount (serif gold for paid, white for pending), Status badge, Receipt link
  - Same alternating row and hover styles as Properties table

---

## Out of Scope

- AgreementViewer (already redesigned)
- Messages / chat UI
- Admin dashboard
- Condition reports upload UI
- Deposit refund flow
- Mobile responsiveness refinements beyond what Tailwind flex/grid provides

---

## Success Criteria

1. All pages listed above render with `#0f172a` page background and `#1C2740` surface cards
2. No remaining instances of `bg-white`, `text-blue-600`, or `border-blue-100` in the redesigned files
3. The brand reads consistently from login → dashboard → properties → agreement — one visual identity throughout
