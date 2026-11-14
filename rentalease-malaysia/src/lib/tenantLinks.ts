// Tenant pages for one specific tenancy. A tenant can have more than one
// (e.g. a renewal offer next to the live tenancy), so links must say which.

export function tenantTenancyHref(tenancyId: string): string {
  return `/dashboard/tenant/tenancy/${encodeURIComponent(tenancyId)}`;
}

export function tenantMessagesHref(tenancyId: string): string {
  return `/dashboard/tenant/messages?tenancyId=${encodeURIComponent(tenancyId)}`;
}
