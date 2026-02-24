import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import Stripe from "stripe";
import { notifyPatient } from "@/lib/notify-patient";

export const dynamic = "force-dynamic";

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error("STRIPE_SECRET_KEY not configured");
  return new Stripe(key, { apiVersion: "2024-06-20" as any });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.text();
    const sig = req.headers.get("stripe-signature");
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

    let event: Stripe.Event;

    if (webhookSecret && sig) {
      const stripe = getStripe();
      event = stripe.webhooks.constructEvent(body, sig, webhookSecret);
    } else {
      // No webhook secret configured — parse directly (dev mode)
      event = JSON.parse(body) as Stripe.Event;
    }

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const packageId = session.metadata?.packageId;
        const isMembership = session.metadata?.type === "membership_subscription";

        if (isMembership) {
          // Membership subscription checkout completed
          const patientId = session.metadata?.patientId;
          const planId = session.metadata?.planId;
          const clinicId = session.metadata?.clinicId;
          const stripeSubscriptionId = session.subscription as string;
          const stripeCustomerId = session.customer as string;

          if (patientId && planId) {
            await (prisma as any).patientSubscription.upsert({
              where: { patientId_planId: { patientId, planId } },
              create: {
                clinicId: clinicId || "",
                patientId,
                planId,
                status: "ACTIVE",
                stripeSubscriptionId,
                stripeCustomerId,
                startDate: new Date(),
                currentPeriodStart: new Date(),
                currentPeriodEnd: session.expires_at
                  ? new Date(session.expires_at * 1000)
                  : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
              },
              update: {
                status: "ACTIVE",
                stripeSubscriptionId,
                stripeCustomerId,
                currentPeriodStart: new Date(),
              },
            });
            console.log(`[stripe-webhook] Membership subscription created for patient ${patientId}, plan ${planId}`);

            // Notify patient: membership activated
            const plan = await (prisma as any).membershipPlan.findUnique({ where: { id: planId } });
            if (plan) {
              const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
              notifyPatient({
                patientId,
                emailTemplateSlug: 'MEMBERSHIP_ACTIVATED',
                emailVars: {
                  planName: plan.name || 'Membership',
                  portalUrl: `${BASE}/dashboard/membership`,
                },
                plainMessage: `Your ${plan.name} membership is now active! Log in to your portal to explore all features.`,
              }).catch(err => console.error('[stripe-webhook] membership notify error:', err));
            }
          }
        } else if (packageId) {
          const pkg = await (prisma as any).treatmentPackage.update({
            where: { id: packageId },
            data: {
              isPaid: true,
              paidAt: new Date(),
              paidAmount: (session.amount_total || 0) / 100,
              paymentMethod: session.payment_method_types?.[0] || "card",
              stripePaymentIntentId: session.payment_intent as string || session.id,
              status: "PAID",
            },
            include: { patient: { select: { id: true, firstName: true } } },
          });
          console.log(`[stripe-webhook] Package ${packageId} marked as PAID`);

          // Notify patient: package payment confirmed
          if (pkg?.patient?.id) {
            const BASE = process.env.NEXTAUTH_URL || 'https://bpr.rehab';
            const amount = ((session.amount_total || 0) / 100).toFixed(2);
            notifyPatient({
              patientId: pkg.patient.id,
              emailTemplateSlug: 'PACKAGE_PAYMENT_CONFIRMED',
              emailVars: {
                packageName: pkg.name || 'Treatment Package',
                amount: `£${amount}`,
                portalUrl: `${BASE}/dashboard/treatment`,
              },
              plainMessage: `Payment of £${amount} confirmed for ${pkg.name || 'your treatment package'}. You can now access your treatment plan.`,
            }).catch(err => console.error('[stripe-webhook] package notify error:', err));
          }
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await (prisma as any).patientSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          const statusMap: Record<string, string> = {
            active: "ACTIVE",
            past_due: "PAST_DUE",
            canceled: "CANCELLED",
            unpaid: "PAST_DUE",
            trialing: "TRIALING",
          };
          const subAny = subscription as any;
          await (prisma as any).patientSubscription.update({
            where: { id: sub.id },
            data: {
              status: statusMap[subscription.status] || "ACTIVE",
              cancelAtPeriodEnd: subscription.cancel_at_period_end,
              currentPeriodStart: subAny.current_period_start ? new Date(subAny.current_period_start * 1000) : undefined,
              currentPeriodEnd: subAny.current_period_end ? new Date(subAny.current_period_end * 1000) : undefined,
              ...(subscription.canceled_at ? { cancelledAt: new Date(subscription.canceled_at * 1000) } : {}),
            },
          });
          console.log(`[stripe-webhook] Subscription ${subscription.id} updated → ${subscription.status}`);
        }
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const sub = await (prisma as any).patientSubscription.findUnique({
          where: { stripeSubscriptionId: subscription.id },
        });
        if (sub) {
          await (prisma as any).patientSubscription.update({
            where: { id: sub.id },
            data: {
              status: "CANCELLED",
              endDate: new Date(),
              cancelledAt: new Date(),
            },
          });
          console.log(`[stripe-webhook] Subscription ${subscription.id} deleted/cancelled`);
        }
        break;
      }

      case "invoice.paid": {
        // For weekly subscription payments
        const invoice = event.data.object as Stripe.Invoice;
        const packageId = (invoice as any).subscription_details?.metadata?.packageId;

        if (packageId) {
          await (prisma as any).treatmentPackage.update({
            where: { id: packageId },
            data: {
              isPaid: true,
              paidAt: new Date(),
              paidAmount: (invoice.amount_paid || 0) / 100,
              stripeInvoiceId: invoice.id,
              status: "ACTIVE",
            },
          });
          console.log(`[stripe-webhook] Subscription invoice paid for package ${packageId}`);
        }
        break;
      }

      default:
        console.log(`[stripe-webhook] Unhandled event: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (err: any) {
    console.error("[stripe-webhook] Error:", err);
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
