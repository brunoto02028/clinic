// Admin pages that act on the whole platform rather than one tenant — BPR's
// public site, every tenant's patient-portal config, the tenant list, the
// platform AI keys, security and logs (activity 52, T-2). Hidden from a
// tenant's staff in the nav (superadminOnly in lib/admin-sections.ts) and
// redirected here by URL. Pure and Edge-safe — the middleware imports it.
export const SUPERADMIN_ONLY_ADMIN_PAGES = [
  "/admin/settings",
  "/admin/patient-portal",
  "/admin/service-pricing",
  "/admin/coupons", // campanhas de desconto (084) — a mesma mão que precifica
  "/admin/articles", // BPR's public blog
  "/admin/clinics",
  "/admin/stripe-branding",
  "/admin/ai-settings",
  "/admin/ai-coworker",
  "/admin/security",
  "/admin/agent-keys",
  "/admin/system-logs",
  "/admin/voice-costs",
];

export function isSuperadminOnlyAdminPage(pathname: string): boolean {
  return SUPERADMIN_ONLY_ADMIN_PAGES.some((r) => pathname === r || pathname.startsWith(r + "/"));
}
