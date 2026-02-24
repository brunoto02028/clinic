import Link from "next/link";
import { prisma } from "@/lib/db";

export const metadata = {
  title: "Cancellation Policy | Bruno Physical Rehabilitation",
  description: "Our cancellation and refund policy for appointments and treatment plans.",
};

async function getSiteSettings() {
  try {
    return await prisma.siteSettings.findFirst({
      select: { siteName: true, logoUrl: true, email: true, phone: true },
    });
  } catch {
    return null;
  }
}

export default async function CancellationPolicyPage() {
  const settings = await getSiteSettings();
  const clinicName = settings?.siteName || "Bruno Physical Rehabilitation";
  const email = settings?.email || "admin@bpr.rehab";
  const phone = settings?.phone || "";

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            {settings?.logoUrl ? (
              <img src={settings.logoUrl} alt={clinicName} className="h-10 w-auto" />
            ) : (
              <span className="text-xl font-bold text-[#1a6b6b]">{clinicName}</span>
            )}
          </Link>
          <Link href="/dashboard" className="text-sm text-[#5dc9c0] hover:text-[#1a6b6b] font-medium transition-colors">
            Patient Portal →
          </Link>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-12 space-y-10">
        {/* Title */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 bg-[#5dc9c0]/10 text-[#1a6b6b] px-4 py-1.5 rounded-full text-sm font-medium">
            Last updated: January 2025
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900">Cancellation & Refund Policy</h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            We understand that plans change. This policy explains your rights and our procedures for cancellations and refunds.
          </p>
        </div>

        {/* Quick Summary Cards */}
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="border-2 border-green-200 bg-green-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">✅</span>
              <h3 className="font-bold text-green-800">Full Refund Eligible</h3>
            </div>
            <p className="text-sm text-green-700">
              Cancel your appointment <strong>more than 48 hours</strong> before the scheduled time and receive a full refund within 3–5 business days.
            </p>
          </div>
          <div className="border-2 border-red-200 bg-red-50 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-2xl">❌</span>
              <h3 className="font-bold text-red-800">No Refund</h3>
            </div>
            <p className="text-sm text-red-700">
              Cancellations made <strong>within 48 hours</strong> of the appointment are non-refundable. The appointment slot cannot be reassigned at short notice.
            </p>
          </div>
        </div>

        {/* Section 1 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#5dc9c0] text-white flex items-center justify-center text-sm font-bold">1</span>
            Individual Appointment Cancellations
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 text-gray-700">
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-green-600 font-bold shrink-0">✓</span>
                <div>
                  <p className="font-semibold text-gray-900">More than 48 hours notice — Full Refund</p>
                  <p className="text-sm mt-0.5">If you cancel your appointment more than 48 hours before the scheduled time, you will receive a full refund of the amount paid. Refunds are processed via the original payment method within 3–5 business days.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-red-500 font-bold shrink-0">✗</span>
                <div>
                  <p className="font-semibold text-gray-900">Less than 48 hours notice — No Refund</p>
                  <p className="text-sm mt-0.5">Cancellations made within 48 hours of the appointment are non-refundable. This is because we are unable to fill the appointment slot at short notice, and our therapists have reserved this time exclusively for you.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-500 font-bold shrink-0">⚠</span>
                <div>
                  <p className="font-semibold text-gray-900">No-Show — No Refund</p>
                  <p className="text-sm mt-0.5">If you do not attend your appointment without prior notice, no refund will be issued.</p>
                </div>
              </div>
            </div>
            <div className="border-t pt-4">
              <p className="text-sm text-gray-600">
                <strong>How to cancel:</strong> Log into your patient portal, navigate to your appointments, and submit a cancellation request. Alternatively, contact us directly at{" "}
                <a href={`mailto:${email}`} className="text-[#5dc9c0] hover:underline">{email}</a>
                {phone && <> or <a href={`tel:${phone}`} className="text-[#5dc9c0] hover:underline">{phone}</a></>}.
              </p>
            </div>
          </div>
        </section>

        {/* Section 2 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#5dc9c0] text-white flex items-center justify-center text-sm font-bold">2</span>
            Treatment Plan Cancellations
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-4 text-gray-700">
            <p>
              Treatment plans involve the reservation of multiple appointment slots over an extended period. Because of this, cancellations are handled differently from individual appointments.
            </p>
            <div className="space-y-3">
              <div className="flex gap-3">
                <span className="text-amber-500 font-bold shrink-0">→</span>
                <div>
                  <p className="font-semibold text-gray-900">All cancellations require admin review</p>
                  <p className="text-sm mt-0.5">Treatment plan cancellations cannot be processed automatically. Each case is reviewed individually by our team, taking into account the number of sessions already completed, the notice given, and the circumstances.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-500 font-bold shrink-0">→</span>
                <div>
                  <p className="font-semibold text-gray-900">Partial refunds may apply</p>
                  <p className="text-sm mt-0.5">If you have not yet started your treatment plan, a full refund may be possible. If sessions have already been completed, a partial refund will be calculated based on the remaining unused sessions, minus an administrative fee.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <span className="text-amber-500 font-bold shrink-0">→</span>
                <div>
                  <p className="font-semibold text-gray-900">Response within 2 business days</p>
                  <p className="text-sm mt-0.5">Once you submit a cancellation request for a treatment plan, our team will contact you within 2 business days to discuss your options.</p>
                </div>
              </div>
            </div>
            <div className="border-t pt-4 bg-amber-50 rounded-xl p-4 -mx-2">
              <p className="text-sm text-amber-800">
                <strong>Important:</strong> When you purchase a treatment plan, appointment slots are reserved specifically for you. This means we may turn away other patients who could have used those slots. We appreciate your understanding of why treatment plan cancellations require careful review.
              </p>
            </div>
          </div>
        </section>

        {/* Section 3 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#5dc9c0] text-white flex items-center justify-center text-sm font-bold">3</span>
            Refund Processing
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 space-y-3 text-gray-700">
            <ul className="space-y-2 text-sm">
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Approved refunds are processed via the original payment method (credit/debit card).</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Refunds typically appear in your account within 3–5 business days, depending on your bank.</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> You will receive an email confirmation once your refund has been processed.</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Stripe processing fees (if any) are non-refundable.</li>
            </ul>
          </div>
        </section>

        {/* Section 4 */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#5dc9c0] text-white flex items-center justify-center text-sm font-bold">4</span>
            Exceptional Circumstances
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 text-sm space-y-2">
            <p>We understand that emergencies happen. In cases of:</p>
            <ul className="space-y-1 ml-4">
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Medical emergencies or hospitalisation</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Bereavement</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Severe weather or transport disruption</li>
            </ul>
            <p className="mt-3">
              Please contact us as soon as possible. We will review your case with compassion and may waive the standard cancellation policy at our discretion. Supporting documentation may be requested.
            </p>
          </div>
        </section>

        {/* Section 5 — Clinic cancellation */}
        <section className="space-y-4">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <span className="w-8 h-8 rounded-full bg-[#5dc9c0] text-white flex items-center justify-center text-sm font-bold">5</span>
            Cancellation by {clinicName}
          </h2>
          <div className="bg-gray-50 rounded-2xl p-6 text-gray-700 text-sm space-y-2">
            <p>In the rare event that we need to cancel your appointment, we will:</p>
            <ul className="space-y-1 ml-4">
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Notify you as soon as possible via email and/or phone.</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Offer you an alternative appointment at your earliest convenience.</li>
              <li className="flex gap-2"><span className="text-[#5dc9c0]">•</span> Issue a full refund if you prefer not to rebook.</li>
            </ul>
          </div>
        </section>

        {/* Contact */}
        <section className="bg-gradient-to-br from-[#5dc9c0]/10 to-[#1a6b6b]/10 rounded-2xl p-8 text-center space-y-4">
          <h2 className="text-xl font-bold text-gray-900">Questions about this policy?</h2>
          <p className="text-gray-600">Our team is happy to help clarify anything.</p>
          <div className="flex flex-wrap gap-3 justify-center">
            <a href={`mailto:${email}`} className="inline-flex items-center gap-2 bg-[#5dc9c0] text-white px-5 py-2.5 rounded-xl font-medium hover:bg-[#1a6b6b] transition-colors text-sm">
              📧 Email Us
            </a>
            {phone && (
              <a href={`tel:${phone}`} className="inline-flex items-center gap-2 border border-[#5dc9c0] text-[#1a6b6b] px-5 py-2.5 rounded-xl font-medium hover:bg-[#5dc9c0]/10 transition-colors text-sm">
                📞 Call Us
              </a>
            )}
            <Link href="/dashboard" className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-5 py-2.5 rounded-xl font-medium hover:bg-gray-50 transition-colors text-sm">
              Patient Portal
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t mt-12 py-6 text-center text-sm text-gray-500">
        <p>© {new Date().getFullYear()} {clinicName}. All rights reserved.</p>
        <div className="flex gap-4 justify-center mt-2">
          <Link href="/" className="hover:text-[#5dc9c0] transition-colors">Home</Link>
          <Link href="/dashboard" className="hover:text-[#5dc9c0] transition-colors">Patient Portal</Link>
        </div>
      </footer>
    </div>
  );
}
