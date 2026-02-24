import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { stripe } from '@/lib/stripe';

// GET — list all service packages
export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const packages = await prisma.servicePackage.findMany({
    orderBy: [{ sortOrder: 'asc' }, { createdAt: 'desc' }],
    include: {
      _count: { select: { patientPackages: true } },
    },
  });

  return NextResponse.json(packages);
}

// POST — create or update a service package
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { id, name, description, price, currency, includedServices, durationDays, sessionsIncluded, isActive, sortOrder } = body;

  if (!name || price === undefined || !includedServices || includedServices.length === 0) {
    return NextResponse.json({ error: 'Name, price, and at least one included service are required' }, { status: 400 });
  }

  const finalPrice = parseFloat(price);
  const finalCurrency = currency || 'GBP';

  const data: any = {
    name,
    description: description || null,
    price: finalPrice,
    currency: finalCurrency,
    includedServices,
    durationDays: durationDays ? parseInt(durationDays) : null,
    sessionsIncluded: sessionsIncluded ? parseInt(sessionsIncluded) : null,
    isActive: isActive !== false,
    sortOrder: sortOrder || 0,
  };

  if (id) {
    // ── UPDATE ──
    const existing = await prisma.servicePackage.findUnique({ where: { id } });

    // Stripe: update product name/description, and create new price if price changed
    let stripeError: string | undefined;
    if (process.env.STRIPE_SECRET_KEY && existing) {
      try {
        if (existing.stripeProductId) {
          // Update product metadata
          await stripe.products.update(existing.stripeProductId, {
            name,
            description: description || `Service package — ${name}`,
            active: isActive !== false,
          });

          // If price changed, deactivate old price and create new one
          if (existing.price !== finalPrice || existing.currency !== finalCurrency) {
            if (existing.stripePriceId) {
              await stripe.prices.update(existing.stripePriceId, { active: false });
            }
            if (finalPrice > 0) {
              const newPrice = await stripe.prices.create({
                product: existing.stripeProductId,
                unit_amount: Math.round(finalPrice * 100),
                currency: finalCurrency.toLowerCase(),
                metadata: { source: 'service_package', packageId: id },
              });
              data.stripePriceId = newPrice.id;
            } else {
              data.stripePriceId = null;
            }
          }
        } else if (finalPrice > 0) {
          // No Stripe product yet — create one
          const product = await stripe.products.create({
            name,
            description: description || `Service package — ${name}`,
            metadata: { source: 'service_package', packageId: id },
          });
          data.stripeProductId = product.id;
          const stripePrice = await stripe.prices.create({
            product: product.id,
            unit_amount: Math.round(finalPrice * 100),
            currency: finalCurrency.toLowerCase(),
            metadata: { source: 'service_package', packageId: id },
          });
          data.stripePriceId = stripePrice.id;
        }
      } catch (err: any) {
        console.error('[service-packages POST] Stripe update error:', err.message);
        stripeError = err.message;
      }
    }

    const updated = await prisma.servicePackage.update({ where: { id }, data });
    return NextResponse.json({ ...updated, stripeError });
  } else {
    // ── CREATE ──
    // Create in DB first to get the ID
    const created = await prisma.servicePackage.create({ data });

    // Stripe: create product + price
    let stripeError: string | undefined;
    if (process.env.STRIPE_SECRET_KEY && finalPrice > 0) {
      try {
        const product = await stripe.products.create({
          name,
          description: description || `Service package — ${name}`,
          metadata: { source: 'service_package', packageId: created.id },
        });
        const stripePrice = await stripe.prices.create({
          product: product.id,
          unit_amount: Math.round(finalPrice * 100),
          currency: finalCurrency.toLowerCase(),
          metadata: { source: 'service_package', packageId: created.id },
        });
        // Save Stripe IDs back to DB
        await prisma.servicePackage.update({
          where: { id: created.id },
          data: { stripeProductId: product.id, stripePriceId: stripePrice.id },
        });
        (created as any).stripeProductId = product.id;
        (created as any).stripePriceId = stripePrice.id;
      } catch (err: any) {
        console.error('[service-packages POST] Stripe create error:', err.message);
        stripeError = err.message;
      }
    }

    return NextResponse.json({ ...created, stripeError });
  }
}

// DELETE — delete a package (archive on Stripe)
export async function DELETE(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: 'Package ID required' }, { status: 400 });

  // Fetch package to get Stripe IDs before deleting
  const pkg = await prisma.servicePackage.findUnique({
    where: { id },
    select: { stripeProductId: true, stripePriceId: true },
  });

  // Archive on Stripe (Stripe doesn't allow hard-delete of products with prices)
  let stripeArchived = false;
  let stripeArchiveError: string | undefined;
  if (pkg?.stripeProductId && process.env.STRIPE_SECRET_KEY) {
    try {
      if (pkg.stripePriceId) {
        await stripe.prices.update(pkg.stripePriceId, { active: false });
      }
      await stripe.products.update(pkg.stripeProductId, { active: false });
      stripeArchived = true;
    } catch (err: any) {
      console.error('[service-packages DELETE] Stripe archive error:', err.message);
      stripeArchiveError = err.message;
    }
  }

  await prisma.servicePackage.delete({ where: { id } });
  return NextResponse.json({
    success: true,
    stripeArchived,
    stripeArchiveError,
    hadStripeProduct: !!pkg?.stripeProductId,
  });
}
