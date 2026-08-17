import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// ─── INLINE SECURITY (Edge Runtime compatible) ───
const rateLimitStore = new Map<string, { count: number; first: number; blocked: boolean; until?: number }>();

function checkRateLimit(ip: string, path: string, opts: { maxRequests: number; windowMs: number; blockDurationMs: number }) {
  const key = `${ip}:${path}`;
  const now = Date.now();
  let entry = rateLimitStore.get(key);
  if (!entry) { entry = { count: 1, first: now, blocked: false }; rateLimitStore.set(key, entry); return { blocked: false, retryAfter: 0 }; }
  if (entry.blocked && entry.until && now > entry.until) { entry.blocked = false; entry.count = 1; entry.first = now; return { blocked: false, retryAfter: 0 }; }
  if (entry.blocked) { return { blocked: true, retryAfter: Math.ceil(((entry.until || now + opts.blockDurationMs) - now) / 1000) }; }
  if (now - entry.first > opts.windowMs) { entry.count = 1; entry.first = now; return { blocked: false, retryAfter: 0 }; }
  entry.count++;
  if (entry.count > opts.maxRequests) { entry.blocked = true; entry.until = now + opts.blockDurationMs; return { blocked: true, retryAfter: Math.ceil(opts.blockDurationMs / 1000) }; }
  return { blocked: false, retryAfter: 0 };
}

function detectThreats(path: string, query: string): boolean {
  const fullUrl = path + query;
  const dangerPatterns = [
    /(\b(union|select|insert|delete|drop)\b.*\b(from|into|table)\b)/i,
    /('|").*(-{2}|\/\*)/,
    /<script[\s>]/i, /javascript:/i, /on(error|load|click)\s*=/i,
    /\.\.\//g, /%2e%2e/i, /etc\/passwd/i,
    /wp-admin/i, /wp-login/i, /xmlrpc\.php/i, /phpmyadmin/i, /\.env$/i, /\.git\//i,
    /shell\.php/i, /cmd\.php/i, /admin\.php/i,
  ];
  return dangerPatterns.some(p => p.test(fullUrl));
}

const SECURITY_HEADERS: Record<string, string> = {
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "X-XSS-Protection": "1; mode=block",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=self, microphone=self, geolocation=()",
};

// Patient-facing API prefixes reachable by the mobile app (bearer-authenticated).
const MOBILE_API_PREFIXES = ['/api/appointments', '/api/exercises', '/api/patient', '/api/education', '/api/foot-scans', '/api/mobile', '/api/medical-screening', '/api/screening-config'];
// CORS for the Expo Web / PWA browser target. Native apps don't enforce CORS;
// bearer (not cookie) auth means "*" doesn't expose any ambient session.
const MOBILE_CORS_ORIGIN = process.env.MOBILE_CORS_ORIGIN || '*';
const MOBILE_CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': MOBILE_CORS_ORIGIN,
  'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};
function isMobileApiPath(pathname: string): boolean {
  return MOBILE_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'));
}

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signout',
  '/signup',
  '/start',
  '/admin-login',
  '/staff-login',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/confirm-email',
  '/api/patient/change-email/confirm',
  '/scan',
  '/api/auth',
  '/api/auth/check-phone',
  '/api/signup',
  '/api/settings',
  '/api/articles',
  '/api/service-pages',
  '/api/version',
  '/api/client-error',
  '/api/foot-scans/session',
  '/api/webhooks',
  '/api/wearables/webhook',
  '/clinics',
  '/test',
  '/preview',
  '/preview-3d',
  '/therapies',
  '/biohacking',
  '/get-the-app',
  '/sitemap.xml',
  '/services',
  '/articles',
  '/conditions', // public SEO bridge pages (P4)
  '/beyond-pain', // Beyond Pain book landing + gated chapter reader
  '/api/beyond-pain', // book email capture + magic-link confirm
  '/help',
  '/terms',
  '/privacy',
  '/cookies',
  '/complaints-policy',
  '/cancellation-policy',
  '/unsubscribe',
  '/api/unsubscribe',
  '/lead-magnet',
  '/api/lead-magnet',
  '/api/newsletter', // public footer newsletter signup (P4) — feeds the same EmailContact/Lead list
  '/intake',
  '/api/intake',
  '/api/analytics/track',
  '/api/sketchfab',
  '/capture',
  '/api/body-assessments/capture',
  '/shop',
  '/api/shop',
  '/api/amazon-image',
  '/api/agent', // OpenClaw Agent API - uses Bearer token authentication
  '/api/admin/maintenance', // protected by x-maintenance-secret header, not session
  '/api/admin/backup', // protected by x-backup-token, or a SUPERADMIN session — the
                       // route checks both itself; a backup runs unattended and
                       // cannot carry a browser session
  '/api/cron', // all cron/* routes verify their own ?key= secret, not session — see each route
  '/api/image-serve', // public image serving from DB (no auth needed to display images)
  '/api/health', // Coolify health check — must be public or deploy zero-downtime breaks
  '/api/pwa-icon', // manifest icons: the OS fetches these with no session; behind
                   // login, "add to home screen" gets a redirect instead of an icon
  '/api/analytics/vitals', // web-vitals beacon fires on public pages too
  '/api/vcard', // the /start page's "save contact" download — no session by definition
  '/api/public', // public read-only endpoints (clinic schedule, etc.)
  '/api/vapi/web-token', // the voice widget sits on the public landing page and the
                         // route is written to work without a session; without this
                         // every anonymous visit spent two requests being bounced
                         // to /login and the widget silently failed
];

// Routes that require SUPERADMIN access
const superadminRoutes = ['/superadmin'];

// Routes that require ADMIN or THERAPIST access
const staffRoutes = ['/admin'];

// Check if path starts with any of the given prefixes
function matchesRoute(path: string, routes: string[]): boolean {
  return routes.some(route => {
    if (route === '/') return path === '/';
    return path === route || path.startsWith(route + '/') || path.startsWith(route + '?');
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Permanent redirect from the retired bpr.rehab domain to bpr.clinic —
  // .rehab reads as an addiction-recovery clinic, which isn't this practice.
  // One hop straight to https://bpr.clinic regardless of the old domain's
  // protocol, so we don't chain this with the HTTPS-upgrade redirect below.
  // Excludes /api/*: third-party webhooks (Stripe, Terra, VAPI...) that may
  // still be registered against the old domain don't follow redirects on
  // POST, so redirecting them would silently break payments/integrations
  // instead of just re-registering the callback URL with each provider.
  const host = request.headers.get('host') || '';
  if ((host === 'bpr.rehab' || host === 'www.bpr.rehab') && !pathname.startsWith('/api')) {
    return NextResponse.redirect(
      `https://bpr.clinic${pathname}${request.nextUrl.search}`,
      301
    );
  }

  // Force HTTPS redirect in production — browser page navigations only.
  // Skip for /api/*: Next's built-in image optimizer (and other server-side
  // code) fetches API routes like /api/image-serve/[id] via an internal
  // loopback request that has no x-forwarded-proto header and reports
  // "host: localhost:<port>". Redirecting that to https://localhost:<port>
  // fails (no TLS listener there), which made every next/image using an
  // /api/image-serve source come back as "not a valid image" in production.
  if (
    process.env.NODE_ENV === 'production' &&
    request.headers.get('x-forwarded-proto') !== 'https' &&
    !pathname.startsWith('/api')
  ) {
    return NextResponse.redirect(
      `https://${request.headers.get('host')}${request.nextUrl.pathname}${request.nextUrl.search}`,
      301
    );
  }

  // Skip middleware for static files and API auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/api/mobile')
  ) {
    return NextResponse.next();
  }

  // CORS preflight for mobile-facing API routes (browser target only).
  if (isMobileApiPath(pathname) && request.method === 'OPTIONS') {
    return new NextResponse(null, { status: 204, headers: MOBILE_CORS_HEADERS });
  }

  // ─── SECURITY LAYER ───
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
    || request.headers.get('x-real-ip')
    || 'unknown';

  // Threat detection (SQL injection, XSS, path traversal, scanners)
  const isThreat = detectThreats(pathname, request.nextUrl.search);

  if (isThreat) {
    // Block malicious requests immediately
    return new NextResponse(JSON.stringify({ error: 'Forbidden' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', ...SECURITY_HEADERS },
    });
  }

  // Rate limiting for API routes
  if (pathname.startsWith('/api') && !pathname.startsWith('/api/auth')) {
    // Stricter limits for login/auth attempts
    const isAuthAttempt = pathname.includes('login') || pathname.includes('signin');
    const limits = isAuthAttempt
      ? { maxRequests: 10, windowMs: 60000, blockDurationMs: 600000 }   // 10 req/min, block 10 min
      : pathname.startsWith('/api/admin')
      ? { maxRequests: 100, windowMs: 60000, blockDurationMs: 300000 }  // 100 req/min for admin
      : { maxRequests: 60, windowMs: 60000, blockDurationMs: 120000 };  // 60 req/min public

    const rateCheck = checkRateLimit(ip, pathname.split('/').slice(0, 4).join('/'), limits);

    if (rateCheck.blocked) {
      return new NextResponse(JSON.stringify({ error: 'Too many requests. Please try again later.' }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json',
          'Retry-After': String(rateCheck.retryAfter || 60),
          ...SECURITY_HEADERS,
        },
      });
    }
  }

  // Allow public routes
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next();
  }

  // Mobile (bearer-token) API requests: skip the cookie-session gate and let the
  // route handler verify the JWT (Node runtime — jsonwebtoken isn't Edge-safe).
  // Restricted to patient-facing prefixes, and we STRIP client-supplied identity
  // headers (x-user-*, x-clinic-id, x-impersonated-by) so a forged Bearer can't
  // spoof them past the gate into header-trusting routes. Threat detection and
  // rate limiting above still apply.
  const authHeader = request.headers.get('authorization');
  if (authHeader?.toLowerCase().startsWith('bearer ') && isMobileApiPath(pathname)) {
    const safeHeaders = new Headers(request.headers);
    safeHeaders.delete('x-user-id');
    safeHeaders.delete('x-user-role');
    safeHeaders.delete('x-clinic-id');
    safeHeaders.delete('x-impersonated-by');
    const res = NextResponse.next({ request: { headers: safeHeaders } });
    res.headers.set('Access-Control-Allow-Origin', MOBILE_CORS_ORIGIN);
    return res;
  }

  // Get the user token
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
  });

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('callbackUrl', pathname);
    return NextResponse.redirect(loginUrl);
  }

  const userRole = token.role as string;
  const userClinicId = token.clinicId as string | null;

  // ── IMPERSONATION: Admin viewing as patient ──
  const rawImpersonateId = request.cookies.get('impersonate-patient-id')?.value;
  // Validate cookie is a valid ID format (cuid or uuid) to prevent injection
  const impersonatePatientId = rawImpersonateId && /^[a-zA-Z0-9_-]{10,50}$/.test(rawImpersonateId) ? rawImpersonateId : undefined;
  const isImpersonating = !!impersonatePatientId && (userRole === 'ADMIN' || userRole === 'SUPERADMIN');

  // For SUPERADMIN, check if they have a selected clinic in cookies
  let activeClinicId = userClinicId;
  if (userRole === 'SUPERADMIN') {
    const selectedClinicId = request.cookies.get('selected-clinic-id')?.value;
    activeClinicId = selectedClinicId || null;
  }

  // Check SUPERADMIN routes
  if (matchesRoute(pathname, superadminRoutes)) {
    if (userRole !== 'SUPERADMIN') {
      // Redirect non-superadmins to their appropriate dashboard
      if (userRole === 'ADMIN' || userRole === 'THERAPIST') {
        return NextResponse.redirect(new URL('/admin', request.url));
      }
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  // ── ROLE-BASED ROUTING ──
  // PATIENT can only access /dashboard/* and /api/*
  // ADMIN, THERAPIST, SUPERADMIN can access /admin/* and /api/*
  // PATIENT cannot access /admin/*
  // Staff/Admin cannot access /dashboard/* (redirects to /admin)
  // EXCEPTION: When impersonating, admin CAN access /dashboard/*

  if (matchesRoute(pathname, staffRoutes)) {
    if (userRole === 'PATIENT') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  if (pathname.startsWith('/dashboard')) {
    if ((userRole === 'SUPERADMIN' || userRole === 'ADMIN' || userRole === 'THERAPIST') && !isImpersonating) {
      // Smart redirect: map /dashboard/X → /admin/X so email links work for staff
      // Exact mappings for routes that differ between patient and admin
      const EXACT_MAP: Record<string, string> = {
        '/dashboard': '/admin',
        '/dashboard/screening': '/admin/screening-preview',
        '/dashboard/membership': '/admin/memberships',
        '/dashboard/consent': '/admin',
        '/dashboard/profile': '/admin',
        '/dashboard/guide': '/admin',
        '/dashboard/questions': '/admin/patient-tasks',
        '/dashboard/clinical-notes': '/admin/patients',
        '/dashboard/exercises': '/admin/patients',
        '/dashboard/education': '/admin/articles',
      };
      if (EXACT_MAP[pathname]) {
        return NextResponse.redirect(new URL(EXACT_MAP[pathname], request.url));
      }
      // Prefix mappings: /dashboard/X/anything → /admin/X (admin has no [id] sub-routes for these)
      const PREFIX_MAP: [string, string][] = [
        ['/dashboard/appointments/', '/admin/appointments'],
        ['/dashboard/screening/', '/admin/screening-preview'],
        ['/dashboard/membership/', '/admin/memberships'],
      ];
      for (const [prefix, target] of PREFIX_MAP) {
        if (pathname.startsWith(prefix)) {
          return NextResponse.redirect(new URL(target, request.url));
        }
      }
      // Default: /dashboard/X → /admin/X (works for exercises, education, clinical-notes, etc.)
      const subPath = pathname.replace('/dashboard', '');
      return NextResponse.redirect(new URL('/admin' + subPath, request.url));
    }
  }

  // API routes: Add activeClinicId to headers for data isolation
  // When impersonating, override user ID and role to the patient's
  if (pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers);

    if (isImpersonating && !pathname.startsWith('/api/admin')) {
      // Patient-facing APIs: act as the patient
      requestHeaders.set('x-user-id', impersonatePatientId || '');
      requestHeaders.set('x-user-role', 'PATIENT');
      requestHeaders.set('x-impersonated-by', token.id as string);
    } else {
      // Admin APIs or not impersonating: use real identity
      requestHeaders.set('x-user-role', userRole);
      requestHeaders.set('x-user-id', token.id as string);
    }

    if (activeClinicId) {
      requestHeaders.set('x-clinic-id', activeClinicId);
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files (public folder)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*|public).*)',
  ],
};
