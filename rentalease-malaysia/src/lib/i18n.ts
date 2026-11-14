/*
 * English / Bahasa Malaysia UI strings — a deliberately small helper.
 *
 * Two languages and a few hundred strings don't need a full i18n library.
 * The user's choice is stored in User.language and carried in the session.
 *
 * Usage
 * -----
 * Server components:
 *     const lang = toLanguage(session.user.language);
 *     t('nav_dashboard', lang)
 * Client components (inside the dashboard): useT() from
 * components/providers/LanguageProvider.
 *
 * Every key in messagesEn must also exist in messagesMs — the type of
 * messagesMs enforces this, so a missing translation is a compile error.
 * Count-dependent English strings come in `_one` / `_other` pairs; use tc().
 *
 * Coverage: the dashboard shell, notifications, banners, status labels,
 * dashboards, the tenant tenancy pages and messages. Deeper pages (agreement
 * viewer, condition reports, deposit settlement, admin tools) are still
 * English-only.
 */

export type Language = 'en' | 'ms';

export const messagesEn = {
  // Navigation and shell
  nav_navigation: 'Navigation',
  nav_dashboard: 'Dashboard',
  nav_properties: 'Properties',
  nav_tenancies: 'Tenancies',
  nav_payments: 'Payments',
  nav_messages: 'Messages',
  nav_my_tenancy: 'My Tenancy',
  nav_conditions: 'Conditions',
  nav_kyc: 'KYC Verification',
  nav_property_verification: 'Property Verification',
  nav_users: 'Users',
  nav_audit_log: 'Audit Log',
  nav_sign_out: 'Sign out',
  nav_open_menu: 'Open navigation menu',
  role_LANDLORD: 'Landlord',
  role_TENANT: 'Tenant',
  role_ADMIN: 'Admin',
  shell_messages: 'Messages',
  shell_messages_unread: 'Messages ({count} unread)',
  shell_notifications: 'Notifications',
  shell_notifications_unread: 'Notifications ({count} unread)',

  // Notifications dropdown
  notifications_title: 'Notifications',
  notifications_mark_all: 'Mark all read',
  notifications_close: 'Close',
  notifications_loading: 'Loading…',
  notifications_empty: 'No notifications yet.',
  notifications_empty_desc: "You'll see updates about invitations, agreements, and payments here.",
  time_just_now: 'just now',
  time_minutes_ago: '{n}m ago',
  time_hours_ago: '{n}h ago',
  time_days_ago: '{n}d ago',

  // Identity verification banner
  kyc_review_title: 'Identity verification under review',
  kyc_review_desc: "An admin is reviewing your submission. You'll be notified once approved.",
  kyc_rejected_title: 'Identity verification rejected',
  kyc_resubmit: 'Resubmit verification',
  kyc_required_title: 'Identity verification required',
  kyc_required_landlord:
    'You cannot add properties or invite tenants until your identity is approved.',
  kyc_required_tenant: 'You cannot accept tenancy invitations until your identity is approved.',
  kyc_verify_now: 'Verify your identity',

  // Dashboard banners
  banner_agreement_review_one: '{count} agreement awaiting your review',
  banner_agreement_review_other: '{count} agreements awaiting your review',
  banner_rejected_payments_one: '{count} payment proof rejected — please re-upload',
  banner_rejected_payments_other: '{count} payment proofs rejected — please re-upload',
  banner_changes_requested_one: '{count} agreement with tenant-requested changes',
  banner_changes_requested_other: '{count} agreements with tenant-requested changes',
  banner_payment_verification_one: '{count} payment proof awaiting verification',
  banner_payment_verification_other: '{count} payment proofs awaiting verification',
  banner_condition_reports_one: '{count} condition report awaiting your response',
  banner_condition_reports_other: '{count} condition reports awaiting your response',

  // Statuses
  tenancy_status_INVITED: 'Invited',
  tenancy_status_PENDING: 'Being prepared',
  tenancy_status_ACTIVE: 'Active',
  tenancy_status_EXPIRED: 'Ended',
  tenancy_status_TERMINATED: 'Terminated',
  agreement_status_DRAFT: 'Draft',
  agreement_status_FINALIZED: 'Ready to sign',
  agreement_status_NEGOTIATING: 'Changes requested',
  agreement_status_PENDING_SIGNATURE_PROOF: 'Awaiting signed copy',
  agreement_status_SIGNED: 'Signed',
  deposit_status_PENDING: 'Not paid',
  deposit_status_UNDER_REVIEW: 'Under review',
  deposit_status_PAID: 'Paid',
  deposit_status_REJECTED: 'Rejected',
  payment_status_PENDING: 'Due',
  payment_status_UNDER_REVIEW: 'Under review',
  payment_status_PAID: 'Paid',
  payment_status_LATE: 'Late',
  payment_status_WAIVED: 'Waived',
  payment_overdue: 'Overdue',
  refund_status_PROPOSED: 'Proposed',
  refund_status_IN_REVIEW: 'Under review',
  refund_status_AGREED: 'Agreed',
  refund_status_DISPUTED: 'Disputed',
  refund_status_PAID: 'Paid',

  // Tenancy progress steps
  step_invite: 'Invite',
  step_agreement: 'Agreement',
  step_deposit: 'Deposit',
  step_condition: 'Condition',
  step_active: 'Active',

  // "What needs attention" hero on each dashboard
  attn_admin_kyc_title_one: '{count} user needs KYC verification',
  attn_admin_kyc_title_other: '{count} users need KYC verification',
  attn_admin_kyc_desc:
    'Review identity documents so verified users can continue their rental workflow.',
  attn_admin_kyc_action: 'Open KYC queue',
  attn_admin_props_title_one: '{count} property needs verification',
  attn_admin_props_title_other: '{count} properties need verification',
  attn_admin_props_desc: 'Review property evidence before landlords invite tenants.',
  attn_admin_props_action: 'Open property queue',
  attn_admin_clear_title: 'Verification queues are clear',
  attn_admin_clear_desc: 'No user or property reviews are waiting right now.',
  attn_admin_clear_action: 'View dashboard',
  attn_landlord_payments_title_one: '{count} payment proof needs review',
  attn_landlord_payments_title_other: '{count} payment proofs need review',
  attn_landlord_payments_desc:
    'Confirm or reject submitted payment evidence to keep rent records current.',
  attn_landlord_payments_action: 'Review payments',
  attn_landlord_agreements_title_one: '{count} agreement needs attention',
  attn_landlord_agreements_title_other: '{count} agreements need attention',
  attn_landlord_agreements_desc:
    'Review requested changes before sending the next agreement version.',
  attn_landlord_agreements_action: 'Review agreements',
  attn_landlord_reports_title_one: '{count} condition report needs review',
  attn_landlord_reports_title_other: '{count} condition reports need review',
  attn_landlord_reports_desc:
    'Check tenant-submitted condition reports and keep the tenancy record complete.',
  attn_landlord_reports_action: 'Review reports',
  attn_landlord_clear_title: 'Portfolio is up to date',
  attn_landlord_clear_desc: 'No urgent landlord actions are waiting right now.',
  attn_landlord_clear_action: 'View properties',
  attn_tenant_agreement_title_one: '{count} agreement needs your review',
  attn_tenant_agreement_title_other: '{count} agreements need your review',
  attn_tenant_agreement_desc:
    'Review the latest agreement terms before signing or requesting changes.',
  attn_tenant_agreement_action: 'Review agreement',
  attn_tenant_payment_title_one: '{count} payment item needs follow-up',
  attn_tenant_payment_title_other: '{count} payment items need follow-up',
  attn_tenant_payment_desc: 'Check payment proof status and fix rejected uploads if needed.',
  attn_tenant_payment_action: 'View payments',
  attn_tenant_report_title_one: '{count} condition report needs your response',
  attn_tenant_report_title_other: '{count} condition reports need your response',
  attn_tenant_report_desc: 'Review the property condition evidence and respond to the report.',
  attn_tenant_report_action: 'Review condition report',
  attn_tenant_clear_title: 'Your tenancy is up to date',
  attn_tenant_clear_desc: 'No urgent tenant actions are waiting right now.',
  attn_tenant_clear_action: 'View tenancy',

  // Tenant dashboard
  dashboard_welcome: 'Welcome back, {name}',
  tenant_dashboard_eyebrow: 'Tenant command center',
  tenant_dashboard_desc: 'Track your home, agreement, rent payments, and required responses.',
  queue_current: 'Current queue',
  queue_pending_invitations: 'Pending invitations',
  queue_agreement_reviews: 'Agreement reviews',
  queue_payment_followups: 'Payment follow-ups',
  queue_condition_reports: 'Condition reports',
  stat_active_tenancies: 'Active tenancies',
  stat_pending_actions: 'Pending actions',
  stat_next_payment: 'Next payment',
  stat_no_rent_due: 'No rent due',
  stat_due_on: 'Due {date}',
  section_pending_invitations: 'Pending invitations',
  section_active_tenancies: 'Active tenancies',
  landlord_named: 'Landlord: {name}',
  btn_view: 'View',
  view_details: 'View details →',
  agreement_label: 'Agreement:',
  review_and_sign: 'Review & sign →',
  next_payment_label: 'Next payment:',
  due_on_lower: 'due {date}',
  proof_rejected: 'Proof rejected',
  tenant_no_tenancies:
    "You don't have any tenancies yet. Your landlord will send you an invitation when they list a room for you.",

  // Tenant tenancy pages
  my_tenancies_title: 'My Tenancies',
  my_tenancies_desc: 'Your current tenancy, any offers waiting for you, and past tenancies.',
  no_tenancy_title: 'No tenancy yet',
  no_tenancy_desc: 'Your tenancy details will appear here once a landlord invites you and you accept.',
  renewal_label: 'Renewal',
  all_my_tenancies: 'All my tenancies',
  my_tenancy_eyebrow: 'My tenancy',
  tenancy_headline_INVITED: 'Invitation received',
  tenancy_headline_desc_INVITED: 'Review and accept or decline your tenancy invitation.',
  tenancy_headline_PENDING: 'Agreement in progress',
  tenancy_headline_desc_PENDING: 'Wait for the landlord to prepare your tenancy agreement.',
  tenancy_headline_ACTIVE: 'Tenancy active',
  tenancy_headline_desc_ACTIVE: 'Your tenancy is running. Monitor payments and reports.',
  tenancy_headline_EXPIRED: 'Tenancy ended',
  tenancy_headline_desc_EXPIRED: 'This tenancy has expired.',
  tenancy_headline_TERMINATED: 'Tenancy terminated',
  tenancy_headline_desc_TERMINATED: 'This tenancy was terminated early.',

  // Messages
  messages_title: 'Messages',
  messages_desc: 'Communication with your landlord for your tenancy.',
  messages_none_title: 'No active tenancy',
  messages_none_desc: 'Messaging becomes available once you accept a tenancy invitation.',

  // Profile
  profile_language: 'Display language',
  profile_language_hint: 'Used for menus, dashboards and your tenancy pages.',
  profile_language_saved: 'Language updated.',
  profile_language_error: 'Could not change the language. Please try again.',
  language_en: 'English',
  language_ms: 'Bahasa Malaysia',
} satisfies Record<string, string>;

export type MessageKey = keyof typeof messagesEn;

export const messagesMs: Record<MessageKey, string> = {
  // Navigation and shell
  nav_navigation: 'Navigasi',
  nav_dashboard: 'Papan Pemuka',
  nav_properties: 'Hartanah',
  nav_tenancies: 'Penyewaan',
  nav_payments: 'Pembayaran',
  nav_messages: 'Mesej',
  nav_my_tenancy: 'Penyewaan Saya',
  nav_conditions: 'Laporan Keadaan',
  nav_kyc: 'Pengesahan KYC',
  nav_property_verification: 'Pengesahan Hartanah',
  nav_users: 'Pengguna',
  nav_audit_log: 'Log Audit',
  nav_sign_out: 'Log keluar',
  nav_open_menu: 'Buka menu navigasi',
  role_LANDLORD: 'Tuan rumah',
  role_TENANT: 'Penyewa',
  role_ADMIN: 'Pentadbir',
  shell_messages: 'Mesej',
  shell_messages_unread: 'Mesej ({count} belum dibaca)',
  shell_notifications: 'Pemberitahuan',
  shell_notifications_unread: 'Pemberitahuan ({count} belum dibaca)',

  // Notifications dropdown
  notifications_title: 'Pemberitahuan',
  notifications_mark_all: 'Tandakan semua telah dibaca',
  notifications_close: 'Tutup',
  notifications_loading: 'Memuatkan…',
  notifications_empty: 'Belum ada pemberitahuan.',
  notifications_empty_desc: 'Kemas kini tentang jemputan, perjanjian dan bayaran akan dipaparkan di sini.',
  time_just_now: 'sebentar tadi',
  time_minutes_ago: '{n} minit lalu',
  time_hours_ago: '{n} jam lalu',
  time_days_ago: '{n} hari lalu',

  // Identity verification banner
  kyc_review_title: 'Pengesahan identiti sedang disemak',
  kyc_review_desc: 'Pentadbir sedang menyemak dokumen anda. Anda akan dimaklumkan sebaik sahaja ia diluluskan.',
  kyc_rejected_title: 'Pengesahan identiti ditolak',
  kyc_resubmit: 'Hantar semula pengesahan',
  kyc_required_title: 'Pengesahan identiti diperlukan',
  kyc_required_landlord:
    'Anda tidak boleh menambah hartanah atau menjemput penyewa sehingga identiti anda diluluskan.',
  kyc_required_tenant: 'Anda tidak boleh menerima jemputan penyewaan sehingga identiti anda diluluskan.',
  kyc_verify_now: 'Sahkan identiti anda',

  // Dashboard banners (Malay has no plural form)
  banner_agreement_review_one: '{count} perjanjian menunggu semakan anda',
  banner_agreement_review_other: '{count} perjanjian menunggu semakan anda',
  banner_rejected_payments_one: '{count} bukti bayaran ditolak — sila muat naik semula',
  banner_rejected_payments_other: '{count} bukti bayaran ditolak — sila muat naik semula',
  banner_changes_requested_one: '{count} perjanjian dengan perubahan yang diminta penyewa',
  banner_changes_requested_other: '{count} perjanjian dengan perubahan yang diminta penyewa',
  banner_payment_verification_one: '{count} bukti bayaran menunggu pengesahan',
  banner_payment_verification_other: '{count} bukti bayaran menunggu pengesahan',
  banner_condition_reports_one: '{count} laporan keadaan menunggu respons anda',
  banner_condition_reports_other: '{count} laporan keadaan menunggu respons anda',

  // Statuses
  tenancy_status_INVITED: 'Dijemput',
  tenancy_status_PENDING: 'Sedang disediakan',
  tenancy_status_ACTIVE: 'Aktif',
  tenancy_status_EXPIRED: 'Tamat',
  tenancy_status_TERMINATED: 'Ditamatkan',
  agreement_status_DRAFT: 'Draf',
  agreement_status_FINALIZED: 'Sedia untuk ditandatangani',
  agreement_status_NEGOTIATING: 'Perubahan diminta',
  agreement_status_PENDING_SIGNATURE_PROOF: 'Menunggu salinan bertandatangan',
  agreement_status_SIGNED: 'Ditandatangani',
  deposit_status_PENDING: 'Belum dibayar',
  deposit_status_UNDER_REVIEW: 'Sedang disemak',
  deposit_status_PAID: 'Dibayar',
  deposit_status_REJECTED: 'Ditolak',
  payment_status_PENDING: 'Perlu dibayar',
  payment_status_UNDER_REVIEW: 'Sedang disemak',
  payment_status_PAID: 'Dibayar',
  payment_status_LATE: 'Lewat',
  payment_status_WAIVED: 'Dikecualikan',
  payment_overdue: 'Tertunggak',
  refund_status_PROPOSED: 'Dicadangkan',
  refund_status_IN_REVIEW: 'Sedang disemak',
  refund_status_AGREED: 'Dipersetujui',
  refund_status_DISPUTED: 'Dipertikaikan',
  refund_status_PAID: 'Dibayar',

  // Tenancy progress steps
  step_invite: 'Jemputan',
  step_agreement: 'Perjanjian',
  step_deposit: 'Deposit',
  step_condition: 'Keadaan',
  step_active: 'Aktif',

  // "What needs attention" hero on each dashboard
  attn_admin_kyc_title_one: '{count} pengguna memerlukan pengesahan KYC',
  attn_admin_kyc_title_other: '{count} pengguna memerlukan pengesahan KYC',
  attn_admin_kyc_desc:
    'Semak dokumen identiti supaya pengguna yang disahkan boleh meneruskan proses sewaan mereka.',
  attn_admin_kyc_action: 'Buka senarai KYC',
  attn_admin_props_title_one: '{count} hartanah memerlukan pengesahan',
  attn_admin_props_title_other: '{count} hartanah memerlukan pengesahan',
  attn_admin_props_desc: 'Semak bukti hartanah sebelum tuan rumah menjemput penyewa.',
  attn_admin_props_action: 'Buka senarai hartanah',
  attn_admin_clear_title: 'Tiada pengesahan yang tertunggak',
  attn_admin_clear_desc: 'Tiada semakan pengguna atau hartanah yang menunggu buat masa ini.',
  attn_admin_clear_action: 'Lihat papan pemuka',
  attn_landlord_payments_title_one: '{count} bukti bayaran perlu disemak',
  attn_landlord_payments_title_other: '{count} bukti bayaran perlu disemak',
  attn_landlord_payments_desc:
    'Sahkan atau tolak bukti bayaran yang dihantar supaya rekod sewa sentiasa terkini.',
  attn_landlord_payments_action: 'Semak bayaran',
  attn_landlord_agreements_title_one: '{count} perjanjian memerlukan perhatian',
  attn_landlord_agreements_title_other: '{count} perjanjian memerlukan perhatian',
  attn_landlord_agreements_desc:
    'Semak perubahan yang diminta sebelum menghantar versi perjanjian seterusnya.',
  attn_landlord_agreements_action: 'Semak perjanjian',
  attn_landlord_reports_title_one: '{count} laporan keadaan perlu disemak',
  attn_landlord_reports_title_other: '{count} laporan keadaan perlu disemak',
  attn_landlord_reports_desc:
    'Semak laporan keadaan yang dihantar oleh penyewa dan pastikan rekod penyewaan lengkap.',
  attn_landlord_reports_action: 'Semak laporan',
  attn_landlord_clear_title: 'Portfolio anda terkini',
  attn_landlord_clear_desc: 'Tiada tindakan segera untuk tuan rumah buat masa ini.',
  attn_landlord_clear_action: 'Lihat hartanah',
  attn_tenant_agreement_title_one: '{count} perjanjian perlu disemak oleh anda',
  attn_tenant_agreement_title_other: '{count} perjanjian perlu disemak oleh anda',
  attn_tenant_agreement_desc:
    'Semak terma terkini perjanjian sebelum menandatangani atau meminta perubahan.',
  attn_tenant_agreement_action: 'Semak perjanjian',
  attn_tenant_payment_title_one: '{count} perkara bayaran memerlukan susulan',
  attn_tenant_payment_title_other: '{count} perkara bayaran memerlukan susulan',
  attn_tenant_payment_desc:
    'Semak status bukti bayaran dan muat naik semula yang ditolak jika perlu.',
  attn_tenant_payment_action: 'Lihat bayaran',
  attn_tenant_report_title_one: '{count} laporan keadaan memerlukan respons anda',
  attn_tenant_report_title_other: '{count} laporan keadaan memerlukan respons anda',
  attn_tenant_report_desc: 'Semak bukti keadaan hartanah dan beri respons kepada laporan tersebut.',
  attn_tenant_report_action: 'Semak laporan keadaan',
  attn_tenant_clear_title: 'Penyewaan anda terkini',
  attn_tenant_clear_desc: 'Tiada tindakan segera untuk penyewa buat masa ini.',
  attn_tenant_clear_action: 'Lihat penyewaan',

  // Tenant dashboard
  dashboard_welcome: 'Selamat kembali, {name}',
  tenant_dashboard_eyebrow: 'Pusat kawalan penyewa',
  tenant_dashboard_desc:
    'Pantau kediaman, perjanjian, bayaran sewa dan tindakan yang perlu anda ambil.',
  queue_current: 'Senarai semasa',
  queue_pending_invitations: 'Jemputan belum dijawab',
  queue_agreement_reviews: 'Semakan perjanjian',
  queue_payment_followups: 'Susulan bayaran',
  queue_condition_reports: 'Laporan keadaan',
  stat_active_tenancies: 'Penyewaan aktif',
  stat_pending_actions: 'Tindakan tertunda',
  stat_next_payment: 'Bayaran seterusnya',
  stat_no_rent_due: 'Tiada sewa perlu dibayar',
  stat_due_on: 'Tarikh akhir {date}',
  section_pending_invitations: 'Jemputan belum dijawab',
  section_active_tenancies: 'Penyewaan aktif',
  landlord_named: 'Tuan rumah: {name}',
  btn_view: 'Lihat',
  view_details: 'Lihat butiran →',
  agreement_label: 'Perjanjian:',
  review_and_sign: 'Semak & tandatangan →',
  next_payment_label: 'Bayaran seterusnya:',
  due_on_lower: 'tarikh akhir {date}',
  proof_rejected: 'Bukti ditolak',
  tenant_no_tenancies:
    'Anda belum mempunyai sebarang penyewaan. Tuan rumah anda akan menghantar jemputan apabila bilik disediakan untuk anda.',

  // Tenant tenancy pages
  my_tenancies_title: 'Penyewaan Saya',
  my_tenancies_desc: 'Penyewaan semasa anda, tawaran yang sedang menunggu dan penyewaan lepas.',
  no_tenancy_title: 'Belum ada penyewaan',
  no_tenancy_desc:
    'Butiran penyewaan anda akan dipaparkan di sini selepas tuan rumah menjemput anda dan anda menerimanya.',
  renewal_label: 'Pembaharuan',
  all_my_tenancies: 'Semua penyewaan saya',
  my_tenancy_eyebrow: 'Penyewaan saya',
  tenancy_headline_INVITED: 'Jemputan diterima',
  tenancy_headline_desc_INVITED: 'Semak dan terima atau tolak jemputan penyewaan anda.',
  tenancy_headline_PENDING: 'Perjanjian sedang disediakan',
  tenancy_headline_desc_PENDING: 'Tunggu tuan rumah menyediakan perjanjian penyewaan anda.',
  tenancy_headline_ACTIVE: 'Penyewaan aktif',
  tenancy_headline_desc_ACTIVE: 'Penyewaan anda sedang berjalan. Pantau bayaran dan laporan.',
  tenancy_headline_EXPIRED: 'Penyewaan tamat',
  tenancy_headline_desc_EXPIRED: 'Penyewaan ini telah tamat tempoh.',
  tenancy_headline_TERMINATED: 'Penyewaan ditamatkan',
  tenancy_headline_desc_TERMINATED: 'Penyewaan ini telah ditamatkan lebih awal.',

  // Messages
  messages_title: 'Mesej',
  messages_desc: 'Komunikasi dengan tuan rumah bagi penyewaan anda.',
  messages_none_title: 'Tiada penyewaan aktif',
  messages_none_desc: 'Mesej boleh digunakan selepas anda menerima jemputan penyewaan.',

  // Profile
  profile_language: 'Bahasa paparan',
  profile_language_hint: 'Digunakan untuk menu, papan pemuka dan halaman penyewaan anda.',
  profile_language_saved: 'Bahasa telah dikemas kini.',
  profile_language_error: 'Bahasa tidak dapat ditukar. Sila cuba lagi.',
  language_en: 'English',
  language_ms: 'Bahasa Malaysia',
};

/** Narrows a stored language preference (a plain string) to a Language. */
export function toLanguage(value: string | null | undefined): Language {
  return value === 'ms' ? 'ms' : 'en';
}

/** BCP 47 locale for dates and numbers in the given language. */
export function localeFor(lang: Language): string {
  return lang === 'ms' ? 'ms-MY' : 'en-MY';
}

/**
 * Translates a key, replacing {placeholders} from vars. Placeholders without
 * a value are left as-is so the gap is visible.
 */
export function t(key: MessageKey, lang: Language, vars?: Record<string, string | number>): string {
  const template = (lang === 'ms' ? messagesMs : messagesEn)[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (match, name: string) => {
    const value = vars[name];
    return value === undefined ? match : String(value);
  });
}

type PluralBase = {
  [K in MessageKey]: K extends `${infer Base}_one` ? Base : never;
}[MessageKey];

/** Count-dependent string: picks `<base>_one` or `<base>_other`, filling {count}. */
export function tc(
  base: PluralBase,
  count: number,
  lang: Language,
  vars?: Record<string, string | number>,
): string {
  const key = (count === 1 ? `${base}_one` : `${base}_other`) as MessageKey;
  return t(key, lang, { count, ...vars });
}

type StatusKind = 'tenancy' | 'agreement' | 'deposit' | 'payment' | 'refund';

/** Display label for an enum status, e.g. statusLabel('agreement', 'SIGNED', 'ms'). */
export function statusLabel(kind: StatusKind, status: string, lang: Language): string {
  const key = `${kind}_status_${status}`;
  if (key in messagesEn) return t(key as MessageKey, lang);
  // Unknown value (e.g. a new enum member): show it readably rather than raw.
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll('_', ' ');
}
