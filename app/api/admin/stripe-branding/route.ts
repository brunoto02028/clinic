export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';

// GET: fetch current Stripe branding settings
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current Stripe account branding
    const account = await stripe.accounts.retrieve();
    const branding = (account as any).settings?.branding || {};
    const businessProfile = (account as any).business_profile || {};

    // Get site settings for logo URL
    const siteSettings = await prisma.siteSettings.findFirst({
      select: { logoUrl: true, siteName: true, email: true, phone: true, address: true },
    });

    return NextResponse.json({
      branding: {
        primaryColor: branding.primary_color || '#5dc9c0',
        secondaryColor: branding.secondary_color || '#1a6b6b',
        logoUrl: branding.logo || null,
        iconUrl: branding.icon || null,
      },
      businessProfile: {
        name: businessProfile.name || siteSettings?.siteName || 'Bruno Physical Rehabilitation',
        supportEmail: businessProfile.support_email || siteSettings?.email || '',
        supportPhone: businessProfile.support_phone || siteSettings?.phone || '',
        url: businessProfile.url || '',
      },
      siteSettings: {
        logoUrl: siteSettings?.logoUrl || '',
        siteName: siteSettings?.siteName || '',
      },
    });
  } catch (err: any) {
    console.error('[stripe-branding] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: update Stripe account branding
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { primaryColor, secondaryColor, businessName, supportEmail, supportPhone, websiteUrl } = body;

    // Update Stripe account settings
    const updateData: any = {
      settings: {
        branding: {
          primary_color: primaryColor || '#5dc9c0',
          secondary_color: secondaryColor || '#1a6b6b',
        },
      },
      business_profile: {},
    };

    if (businessName) updateData.business_profile.name = businessName;
    if (supportEmail) updateData.business_profile.support_email = supportEmail;
    if (supportPhone) updateData.business_profile.support_phone = supportPhone;
    if (websiteUrl) updateData.business_profile.url = websiteUrl;

    // Use direct Stripe API call — stripe.accounts.update() only works for connected accounts
    // For the main account, use POST /v1/account directly
    const stripeKey = process.env.STRIPE_SECRET_KEY;
    if (!stripeKey) {
      return NextResponse.json({ error: 'Stripe secret key not configured' }, { status: 500 });
    }

    const params = new URLSearchParams();
    params.append('settings[branding][primary_color]', primaryColor || '#5dc9c0');
    params.append('settings[branding][secondary_color]', secondaryColor || '#1a6b6b');
    if (businessName) params.append('business_profile[name]', businessName);
    if (supportEmail) params.append('business_profile[support_email]', supportEmail);
    if (websiteUrl) params.append('business_profile[url]', websiteUrl);
    // supportPhone omitted — not required and can cause validation issues

    const stripeRes = await fetch('https://api.stripe.com/v1/account', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const stripeData = await stripeRes.json();
    if (!stripeRes.ok) {
      console.error('[stripe-branding] Stripe API error:', stripeData);
      return NextResponse.json({ error: stripeData.error?.message || 'Stripe update failed' }, { status: 400 });
    }

    return NextResponse.json({ success: true, message: 'Stripe branding updated successfully' });
  } catch (err: any) {
    console.error('[stripe-branding] POST error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
