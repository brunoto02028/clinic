import { getToken } from 'next-auth/jwt';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// Routes that don't require authentication
const publicRoutes = [
  '/',
  '/login',
  '/signup',
  '/admin-login',
  '/staff-login',
  '/verify',
  '/forgot-password',
  '/reset-password',
  '/scan',
  '/api/auth',
  '/api/signup',
  '/api/settings',
  '/api/articles',
  '/api/service-pages',
  '/api/version',
  '/api/foot-scans/session',
  '/api/webhooks',
  '/clinics',
  '/test',
  '/preview',
  '/preview-3d',
  '/therapies',
  '/custom-insoles',
  '/biomechanical-assessment',
  '/services',
  '/articles',
  '/terms',
  '/intake',
  '/api/intake',
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

  // Skip middleware for static files and API auth routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/favicon') ||
    pathname.includes('.') ||
    pathname.startsWith('/api/auth')
  ) {
    return NextResponse.next();
  }

  // Allow public routes
  if (matchesRoute(pathname, publicRoutes)) {
    return NextResponse.next();
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
  const impersonatePatientId = request.cookies.get('impersonate-patient-id')?.value;
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
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // API routes: Add activeClinicId to headers for data isolation
  // When impersonating, override user ID and role to the patient's
  if (pathname.startsWith('/api')) {
    const requestHeaders = new Headers(request.headers);

    if (isImpersonating && !pathname.startsWith('/api/admin')) {
      // Patient-facing APIs: act as the patient
      requestHeaders.set('x-user-id', impersonatePatientId!);
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
