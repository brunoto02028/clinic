"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Users,
  Calendar,
  FileText,
  Settings,
  BookOpen,
  LogOut,
  Menu,
  X,
  ChevronRight,
  ChevronDown,
  Activity,
  UserCheck,
  Footprints,
  Building2,
  Stethoscope,
  ClipboardList,
  ShieldCheck,
  Heart,
  Package,
  Video,
  Megaphone,
  PenSquare,
  LayoutTemplate,
  CalendarRange,
  GraduationCap,
  PlayCircle,
  FolderOpen,
  ClipboardCheck,
  ScanText,
  ScrollText,
  Dumbbell,
  Brain,
  Mic,
  Mail,
  MailOpen,
  Image as ImageIcon,
  HeartPulse,
  CreditCard,
  XCircle,
  Palette,
  Crown,
  Send,
  Trophy,
  Map,
  ShoppingCart,
  Target,
  Award,
  Globe,
  DollarSign,
  Box,
  BarChart3,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/ui/logo";
import { ClinicSelector } from "./clinic-selector";
import { LocaleToggle } from "@/components/locale-toggle";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface StaffPermissions {
  canManageUsers?: boolean;
  canManageAppointments?: boolean;
  canManageArticles?: boolean;
  canManageSettings?: boolean;
  canViewAllPatients?: boolean;
  canCreateClinicalNotes?: boolean;
  canManageFootScans?: boolean;
  canManageOrders?: boolean;
}

interface AdminSidebarProps {
  user: {
    firstName?: string;
    lastName?: string;
    email?: string;
    role?: string;
    permissions?: StaffPermissions;
  };
}

interface NavItem {
  name: string;
  i18nKey?: string;
  href: string;
  icon: any;
  superAdminOnly?: boolean;
  requiredPermission?: keyof StaffPermissions;
}

interface NavGroup {
  label: string;
  i18nKey?: string;
  icon: any;
  items: NavItem[];
}

const navigationGroups: NavGroup[] = [
  {
    label: "Overview",
    i18nKey: "nav.dashboard",
    icon: LayoutDashboard,
    items: [
      { name: "Dashboard", i18nKey: "nav.dashboard", href: "/admin", icon: LayoutDashboard },
      { name: "Command Center", href: "/admin/command-center", icon: Brain, superAdminOnly: true },
      { name: "Global View", href: "/admin/global-dashboard", icon: Building2, superAdminOnly: true },
    ],
  },
  {
    label: "Clinic",
    i18nKey: "sidebar.clinic",
    icon: Stethoscope,
    items: [
      { name: "Appointments", i18nKey: "nav.appointments", href: "/admin/appointments", icon: Calendar, requiredPermission: "canManageAppointments" },
      { name: "Treatment Types", i18nKey: "nav.treatments", href: "/admin/treatments", icon: Stethoscope },
      { name: "Treatment Plans", i18nKey: "nav.treatmentPlans", href: "/admin/treatment-plans", icon: Package },
      { name: "Membership Plans", href: "/admin/memberships", icon: Crown },
      { name: "Video Consultations", i18nKey: "nav.videoConsultations", href: "/admin/video-consultations", icon: Video },
      { name: "Clinical Notes", i18nKey: "nav.clinicalNotes", href: "/admin/clinical-notes", icon: ClipboardList, requiredPermission: "canCreateClinicalNotes" },
      { name: "Foot Scans", i18nKey: "nav.footScans", href: "/admin/scans", icon: Footprints, requiredPermission: "canManageFootScans" },
      { name: "Body Assessment", i18nKey: "nav.bodyAssessment", href: "/admin/body-assessments", icon: Activity },
      { name: "3D Body Models", href: "/admin/body-models", icon: Box },
      { name: "Blood Pressure", href: "/admin/blood-pressure", icon: HeartPulse },
      { name: "Email", i18nKey: "nav.email", href: "/admin/email", icon: Mail },
      { name: "Email Templates", i18nKey: "nav.emailTemplates", href: "/admin/email-templates", icon: MailOpen },
      { name: "Email Marketing", href: "/admin/email-marketing", icon: Send },
      { name: "Media Library", i18nKey: "nav.mediaLibrary", href: "/admin/media", icon: ImageIcon },
      { name: "Finance", i18nKey: "nav.finance", href: "/admin/finance", icon: DollarSign },
      { name: "Service Pricing", href: "/admin/service-pricing", icon: CreditCard, requiredPermission: "canManageOrders" },
      { name: "Stripe Branding", href: "/admin/stripe-branding", icon: Palette, requiredPermission: "canManageSettings" },
      { name: "Cancellations", href: "/admin/cancellations", icon: XCircle, requiredPermission: "canManageAppointments" },
      { name: "Service Pages", href: "/admin/service-pages", icon: Globe, requiredPermission: "canManageSettings" },
      { name: "Site Settings", i18nKey: "nav.siteSettings", href: "/admin/settings", icon: Settings, requiredPermission: "canManageSettings" },
    ],
  },
  {
    label: "Patients",
    i18nKey: "sidebar.patients",
    icon: Heart,
    items: [
      { name: "All Patients", i18nKey: "nav.allPatients", href: "/admin/patients", icon: UserCheck, requiredPermission: "canViewAllPatients" },
      { name: "Patient Portal", i18nKey: "nav.patientPortal", href: "/admin/patient-portal", icon: Users },
      { name: "Exercise Library", i18nKey: "nav.exerciseLibrary", href: "/admin/exercises", icon: Dumbbell },
    ],
  },
  {
    label: "Marketing",
    i18nKey: "sidebar.marketing",
    icon: Megaphone,
    items: [
      { name: "Site Analytics", href: "/admin/analytics", icon: BarChart3 },
      { name: "Social Media", i18nKey: "nav.socialMedia", href: "/admin/social", icon: Megaphone },
      { name: "Create Post", i18nKey: "nav.createPost", href: "/admin/social/create", icon: PenSquare },
      { name: "Campaigns", i18nKey: "nav.campaigns", href: "/admin/social/campaigns", icon: CalendarRange },
      { name: "Templates", i18nKey: "nav.templates", href: "/admin/social/templates", icon: LayoutTemplate },
    ],
  },
  {
    label: "Education",
    i18nKey: "sidebar.education",
    icon: GraduationCap,
    items: [
      { name: "Content Library", i18nKey: "nav.contentLibrary", href: "/admin/education", icon: GraduationCap },
      { name: "Create Content", i18nKey: "nav.createContent", href: "/admin/education/create", icon: PenSquare },
      { name: "Categories", i18nKey: "nav.categories", href: "/admin/education/categories", icon: FolderOpen },
      { name: "Assignments", i18nKey: "nav.assignments", href: "/admin/education/assignments", icon: ClipboardCheck },
    ],
  },
  {
    label: "BPR Journey",
    icon: Trophy,
    items: [
      { name: "Journey Control Centre", href: "/admin/journey", icon: Map },
      { name: "Conditions Library", href: "/admin/conditions", icon: Activity },
      { name: "Quizzes", href: "/admin/quizzes", icon: BookOpen },
      { name: "Achievements", href: "/admin/achievements", icon: Award },
      { name: "Challenges", href: "/admin/journey#challenges", icon: Trophy },
      { name: "Triggers & Cron", href: "/admin/journey#notifications", icon: Target },
    ],
  },
  {
    label: "Marketplace",
    icon: ShoppingCart,
    items: [
      { name: "Products & Orders", href: "/admin/marketplace", icon: ShoppingCart },
    ],
  },
  {
    label: "Documents",
    i18nKey: "sidebar.documents",
    icon: FileText,
    items: [
      { name: "Document Processing", i18nKey: "nav.documentProcessing", href: "/admin/documents", icon: ScanText },
    ],
  },
  {
    label: "Admin",
    i18nKey: "sidebar.admin",
    icon: ShieldCheck,
    items: [
      { name: "Users & Staff", i18nKey: "nav.usersStaff", href: "/admin/users", icon: Users, requiredPermission: "canManageUsers" },
      { name: "Articles / Blog", i18nKey: "nav.articlesBlog", href: "/admin/articles", icon: BookOpen, requiredPermission: "canManageArticles" },
      { name: "Clinics", i18nKey: "nav.clinics", href: "/admin/clinics", icon: Building2, superAdminOnly: true },
      { name: "System Logs", i18nKey: "nav.systemLogs", href: "/admin/system-logs", icon: ScrollText },
      { name: "Voice Costs", i18nKey: "nav.voiceCosts", href: "/admin/voice-costs", icon: Mic },
      { name: "API & AI Settings", i18nKey: "nav.aiSettings", href: "/admin/ai-settings", icon: Brain, superAdminOnly: true },
    ],
  },
];

function CollapsibleGroup({
  group,
  pathname,
  userRole,
  permissions,
  onNavigate,
  isOpen,
  onToggle,
  locale,
}: {
  group: NavGroup;
  pathname: string;
  userRole?: string;
  permissions?: StaffPermissions;
  onNavigate?: () => void;
  isOpen: boolean;
  onToggle: () => void;
  locale: "en-GB" | "pt-BR";
}) {
  const open = isOpen;
  const GroupIcon = group.icon;
  const T = (key: string | undefined, fallback: string) => key ? i18nT(key, locale) : fallback;

  // SUPERADMIN and ADMIN see everything; THERAPIST filtered by permissions
  const isFullAccess = userRole === "SUPERADMIN" || userRole === "ADMIN";

  const visibleItems = group.items
    .filter((item) => !item.superAdminOnly || userRole === "SUPERADMIN")
    .filter((item) => {
      if (isFullAccess || !item.requiredPermission) return true;
      return permissions?.[item.requiredPermission] === true;
    })
    .sort((a, b) => {
      const nameA = a.i18nKey ? i18nT(a.i18nKey, locale) : a.name;
      const nameB = b.i18nKey ? i18nT(b.i18nKey, locale) : b.name;
      return nameA.localeCompare(nameB, locale);
    });

  if (visibleItems.length === 0) return null;

  const hasActiveItem = visibleItems.some(
    (item) =>
      pathname === item.href ||
      (item.href !== "/admin" && pathname?.startsWith(item.href))
  );

  return (
    <div>
      <button
        onClick={onToggle}
        className={cn(
          "w-full flex items-center gap-2 px-2 py-2 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors select-none",
          hasActiveItem && !open
            ? "text-primary"
            : "text-muted-foreground/70 hover:text-foreground hover:bg-muted/50"
        )}
      >
        <GroupIcon className="h-4 w-4 shrink-0" />
        <span className="flex-1 text-left">{T(group.i18nKey, group.label)}</span>
        {hasActiveItem && !open && (
          <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
        )}
        <ChevronDown
          className={cn(
            "h-3.5 w-3.5 shrink-0 transition-transform duration-200",
            open ? "rotate-0" : "-rotate-90"
          )}
        />
      </button>
      <div
        className={cn(
          "overflow-hidden transition-all duration-200",
          open ? "max-h-[800px] opacity-100 mt-0.5" : "max-h-0 opacity-0"
        )}
      >
        <ul role="list" className="space-y-0.5 pl-2">
          {visibleItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/admin" && pathname?.startsWith(item.href));
            return (
              <li key={item.name}>
                <Link
                  href={item.href}
                  onClick={onNavigate}
                  className={cn(
                    "group flex items-center gap-x-3 rounded-lg px-2 py-1.5 text-sm font-medium transition-colors",
                    isActive
                      ? "sidebar-nav-item-active text-primary bg-primary/10"
                      : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {T(item.i18nKey, item.name)}
                  {isActive && (
                    <ChevronRight className="ml-auto h-3.5 w-3.5" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

export function AdminSidebar({ user }: AdminSidebarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [logoReady, setLogoReady] = useState(false);
  const pathname = usePathname();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);

  useEffect(() => {
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        setLogoUrl(data.logoUrl || null);
        setDarkLogoUrl(data.darkLogoUrl || null);
        setLogoReady(true);
      })
      .catch(err => {
        console.error("Failed to fetch settings:", err);
        setLogoReady(true);
      });
  }, []);

  const isGroupActive = useCallback(
    (group: NavGroup) =>
      group.items.some(
        (item) =>
          pathname === item.href ||
          (item.href !== "/admin" && pathname?.startsWith(item.href))
      ),
    [pathname]
  );

  // Accordion state: only one group open at a time
  const [openGroup, setOpenGroup] = useState<string | null>(() => {
    // Default: open the group that has the active item
    const active = navigationGroups.find(g => isGroupActive(g));
    return active ? active.label : "Overview";
  });

  // When pathname changes, auto-open the group with the active item
  useEffect(() => {
    const active = navigationGroups.find(g => isGroupActive(g));
    if (active) setOpenGroup(active.label);
  }, [pathname, isGroupActive]);

  const renderNav = (onNavigate?: () => void) => (
    <div className="space-y-1">
      {navigationGroups.map((group) => (
        <CollapsibleGroup
          key={group.label}
          group={group}
          pathname={pathname}
          userRole={user.role}
          permissions={user.permissions}
          onNavigate={onNavigate}
          isOpen={openGroup === group.label}
          onToggle={() => setOpenGroup(prev => prev === group.label ? null : group.label)}
          locale={locale}
        />
      ))}
    </div>
  );

  return (
    <>
      {/* Mobile menu button */}
      <div className="sticky top-0 z-40 flex items-center gap-x-6 header-futuristic px-4 py-4 sm:px-6 lg:hidden">
        <button
          type="button"
          className="-m-2.5 p-2.5 text-muted-foreground lg:hidden"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu className="h-6 w-6" />
        </button>
        <div className={`flex-1 transition-opacity duration-200 ${logoReady ? 'opacity-100' : 'opacity-0'}`}>
          <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" showText={true} linkTo="/admin" />
        </div>
      </div>

      {/* Mobile sidebar */}
      {mobileMenuOpen && (
        <div className="relative z-50 lg:hidden">
          <div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 w-full max-w-xs sidebar-futuristic overflow-y-auto">
            <div className="flex h-14 items-center justify-between px-4 border-b border-white/5 sticky top-0 z-10" style={{background: 'hsla(220, 40%, 8%, 0.95)'}}>
              <div className={`transition-opacity duration-200 ${logoReady ? 'opacity-100' : 'opacity-0'}`}>
                <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="sm" showText={true} linkTo="/admin" />
              </div>
              <button
                type="button"
                className="-m-2.5 p-2.5"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="p-3">
              {renderNav(() => setMobileMenuOpen(false))}
            </nav>
            <div className="border-t border-white/5 p-3 mt-2">
              <div className="flex items-center gap-3 px-2 mb-3">
                <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="text-xs font-medium text-primary">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{user.firstName} {user.lastName}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {user.role === "SUPERADMIN" || user.role === "ADMIN" ? "Admin" : user.role === "THERAPIST" ? T("patient.therapist") : T("patient.patient")}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  className="flex-1 justify-start text-muted-foreground hover:text-destructive"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                >
                  <LogOut className="h-4 w-4 mr-2" />
                  {T("nav.signOut")}
                </Button>
                <LocaleToggle />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:z-50 lg:flex lg:w-72 lg:flex-col">
        <div className="flex grow flex-col overflow-y-auto sidebar-futuristic">
          <div className="flex h-16 shrink-0 items-center border-b border-white/5 px-6">
            <div className={`transition-opacity duration-200 ${logoReady ? 'opacity-100' : 'opacity-0'}`}>
              <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="md" showText={true} linkTo="/admin" />
            </div>
          </div>

          {user.role === "SUPERADMIN" && (
            <div className="px-4 pt-4">
              <ClinicSelector />
            </div>
          )}

          <nav className="flex-1 px-4 py-3 overflow-y-auto">
            {renderNav()}
          </nav>

          <div className="border-t border-white/5 p-4 shrink-0">
            <div className="flex items-center gap-3 px-2">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center animate-neon-pulse">
                <span className="text-sm font-medium text-primary">
                  {user.firstName?.[0]}
                  {user.lastName?.[0]}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">
                  {user.firstName} {user.lastName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {user.role === "SUPERADMIN" || user.role === "ADMIN" ? "Admin" : user.role === "THERAPIST" ? T("patient.therapist") : T("patient.patient")}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 mt-3">
              <Button
                variant="ghost"
                className="flex-1 justify-start text-muted-foreground hover:text-destructive"
                onClick={() => signOut({ callbackUrl: "/login" })}
              >
                <LogOut className="h-4 w-4 mr-2" />
                {T("nav.signOut")}
              </Button>
              <LocaleToggle />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
