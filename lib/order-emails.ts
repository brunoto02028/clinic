// lib/order-emails.ts — Emails a shop buyer gets. Written to work for someone
// with no BPR account, since that is who buys a book from an advert.

import { sendEmail } from "@/lib/email";
import { buildTrackingUrl, carrierName } from "@/lib/shipping-carriers";

const BASE = process.env.NEXTAUTH_URL || "https://bpr.clinic";

interface OrderLike {
  orderNumber: string;
  total: number;
  customerEmail?: string | null;
  customerName?: string | null;
  carrier?: string | null;
  trackingNumber?: string | null;
  trackingUrl?: string | null;
  shippingName?: string | null;
  patient?: { email?: string | null; firstName?: string | null } | null;
}

/** Guests have no account, so their address on the order is the only way to
 *  reach them. Patients fall back to their account email. */
export function buyerEmail(order: OrderLike): string | null {
  return order.customerEmail || order.patient?.email || null;
}

function buyerName(order: OrderLike): string {
  return order.customerName || order.shippingName || order.patient?.firstName || "there";
}

function shell(body: string): string {
  return `<div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;padding:24px;color:#1a1a1a;line-height:1.6">
${body}
<hr style="border:none;border-top:1px solid #e5e5e5;margin:28px 0">
<p style="font-size:12px;color:#777;margin:0">Bruno Physical Rehabilitation · Ipswich, UK<br>
<a href="${BASE}" style="color:#777">bpr.clinic</a></p>
</div>`;
}

/** Sent the moment the order is placed. Someone who just typed their card
 *  details needs a receipt immediately, account or not. */
export async function sendOrderConfirmationEmail(order: OrderLike) {
  const to = buyerEmail(order);
  if (!to) return { success: false, error: "no buyer email on order" };

  return sendEmail({
    to,
    subject: `Order ${order.orderNumber} confirmed`,
    html: shell(`
<h1 style="font-size:20px;margin:0 0 12px">Thank you, ${buyerName(order)}</h1>
<p style="margin:0 0 16px">Your order is confirmed. We'll email you again the moment it's posted, with a tracking number.</p>
<table style="width:100%;border-collapse:collapse;margin:0 0 16px">
  <tr><td style="padding:6px 0;color:#666">Order</td><td style="padding:6px 0;text-align:right"><strong>${order.orderNumber}</strong></td></tr>
  <tr><td style="padding:6px 0;color:#666">Total paid</td><td style="padding:6px 0;text-align:right"><strong>£${order.total.toFixed(2)}</strong></td></tr>
</table>
<p style="margin:0;font-size:13px;color:#666">Changed your mind? You have 14 days from delivery to cancel and return it. Just reply to this email.</p>`),
  });
}

/** Sent when the order is marked as shipped. The tracking link follows the
 *  carrier actually used — a parcel sent by Evri must not link to Royal Mail. */
export async function sendDispatchEmail(order: OrderLike) {
  const to = buyerEmail(order);
  if (!to) return { success: false, error: "no buyer email on order" };

  const url = buildTrackingUrl(order.carrier, order.trackingNumber, order.trackingUrl);
  const name = carrierName(order.carrier);

  // Untracked post is a normal way to send a book, so the email still goes
  // out — it just has nothing to link to.
  const trackingBlock = order.trackingNumber
    ? `<table style="width:100%;border-collapse:collapse;margin:0 0 16px">
  ${name ? `<tr><td style="padding:6px 0;color:#666">Sent by</td><td style="padding:6px 0;text-align:right"><strong>${name}</strong></td></tr>` : ""}
  <tr><td style="padding:6px 0;color:#666">Tracking</td><td style="padding:6px 0;text-align:right"><strong>${order.trackingNumber}</strong></td></tr>
</table>
${url ? `<p style="margin:0 0 20px"><a href="${url}" style="display:inline-block;background:#1a1a1a;color:#fff;padding:11px 20px;border-radius:8px;text-decoration:none">Track your parcel</a></p>` : ""}`
    : `<p style="margin:0 0 16px;font-size:14px;color:#666">This one went by untracked post, so there's no link to follow — it should arrive within a few working days.</p>`;

  return sendEmail({
    to,
    subject: `Your order ${order.orderNumber} is on its way`,
    html: shell(`
<h1 style="font-size:20px;margin:0 0 12px">It's on its way, ${buyerName(order)}</h1>
<p style="margin:0 0 16px">Order <strong>${order.orderNumber}</strong> has been posted${name ? ` with ${name}` : ""}.</p>
${trackingBlock}
<p style="margin:0;font-size:13px;color:#666">Anything wrong when it arrives? Reply to this email and we'll sort it.</p>`),
  });
}
