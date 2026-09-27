export const dynamic = 'force-dynamic';

import { NextRequest, NextResponse } from 'next/server';
import { stripe } from '@/lib/stripe';
import { prisma } from '@/lib/db';
import { getSuperadminActor } from '@/lib/tenant-access';

/**
 * O que o Stripe tem de marca na conta da BPR — **só leitura**.
 *
 * ## O POST saiu daqui, porque o Stripe o recusa
 *
 * Esta rota tinha um POST que mandava cor, nome e e-mail de suporte para
 * `POST /v1/account`. O Stripe responde **403** a isso, sempre:
 *
 * > You cannot use this method on your own account: you may only use it on
 * > connected accounts.
 *
 * Vale para cor, para nome do negócio e para o logo — a conta da própria
 * plataforma se configura **pelo painel do Stripe**, não por API. O comentário
 * que estava aqui dizia o contrário ("for the main account, use POST /v1/account
 * directly"), a tela oferecia um botão de salvar, e cada clique voltava 400.
 *
 * Conferido em 27/09/2026 contra a conta `acct_1UKJBC…` (sandbox da BPR): os três
 * caminhos — `/v1/account`, `/v1/accounts/<id>` e o upload de File com
 * `settings[branding][logo]` — recusam igual. O upload do arquivo funciona; o que
 * não existe é como prendê-lo na conta.
 *
 * Então a rota lê, e a tela manda a pessoa ao painel. É menos do que parecia
 * antes, e é tudo o que existe.
 *
 * SUPERADMIN only (atividade 52, T-2).
 */
export async function GET(req: NextRequest) {
  try {
    if (!(await getSuperadminActor(req))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
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
        primaryColor: branding.primary_color || '#4F7361',
        secondaryColor: branding.secondary_color || '#3D5A4D',
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
      /**
       * Onde a marca se muda de verdade. O id vai junto porque quem tem mais de
       * uma conta (sandbox e produção) precisa saber **em qual** está mexendo —
       * e porque o nome do sandbox termina em "sandbox", o que é a única pista
       * de que não é a conta que recebe dinheiro.
       */
      painel: {
        contaId: account.id,
        modo: (process.env.STRIPE_SECRET_KEY || '').startsWith('sk_test_') ? 'test' : 'live',
        url: 'https://dashboard.stripe.com/settings/branding',
      },
    });
  } catch (err: any) {
    console.error('[stripe-branding] GET error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
