"use client";
import { CheckCircle, Crown, Lock, Repeat, X } from "lucide-react";
import { Dumbbell, BookOpen, Heart, Activity, Footprints, Zap, Stethoscope, FileText, ClipboardList, Video, MessageSquare, BarChart3, Star } from "lucide-react";

export const FEATURES = [
  { key: "exercise_library",    label: "Exercise Video Library",     icon: Dumbbell },
  { key: "health_tips",         label: "Health Tips & Education",    icon: BookOpen },
  { key: "blood_pressure",      label: "Blood Pressure Monitoring",  icon: Heart },
  { key: "body_assessment",     label: "Body Assessment",            icon: Activity },
  { key: "foot_scan",           label: "Foot Scan Reports",          icon: Footprints },
  { key: "ai_insights",         label: "AI Health Insights",         icon: Zap },
  { key: "appointment_booking", label: "Appointment Booking",        icon: Stethoscope },
  { key: "treatment_protocol",  label: "Treatment Protocol Access",  icon: FileText },
  { key: "clinical_notes",      label: "Clinical Notes Access",      icon: ClipboardList },
  { key: "document_upload",     label: "Document Upload",            icon: FileText },
  { key: "video_consultations", label: "Video Consultations",        icon: Video },
  { key: "priority_support",    label: "Priority Support",           icon: MessageSquare },
  { key: "progress_tracking",   label: "Progress Tracking",          icon: BarChart3 },
  { key: "nutrition_tips",      label: "Nutrition & Lifestyle Tips", icon: Star },
];

export const INTERVAL_LABELS: Record<string, string> = {
  MONTHLY: "month", WEEKLY: "week", YEARLY: "year",
};

interface MembershipPlan {
  id: string; name: string; description: string | null; status: string;
  price: number; interval: string; isFree: boolean; features: string[];
  patientScope: string; patient: { firstName: string; lastName: string } | null;
  stripeProductId?: string | null;
}
interface StripeBranding {
  primaryColor: string; secondaryColor: string; businessName: string; logoUrl: string;
}

interface Props {
  plan: MembershipPlan;
  branding: StripeBranding;
  onClose: () => void;
}

export default function MembershipPreviewModal({ plan, branding, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-violet-500 to-violet-700">
              <Crown className="h-5 w-5 text-white" />
            </div>
            <div>
              <h2 className="text-base font-bold">Stripe Checkout Preview</h2>
              <p className="text-xs text-muted-foreground">How the patient sees the subscription payment page</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-muted"><X className="h-5 w-5" /></button>
        </div>

        <div className="p-5">
          {/* Mock Stripe checkout frame */}
          <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg">
            {/* Brand bar */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})` }} />

            <div className="flex flex-col sm:flex-row">
              {/* Left — order summary */}
              <div className="sm:w-2/5 bg-gray-50 p-5 border-b sm:border-b-0 sm:border-r space-y-4">
                <div className="flex items-center gap-2">
                  {branding.logoUrl
                    ? <img src={branding.logoUrl} alt="" className="h-8 w-auto object-contain" />
                    : <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: branding.primaryColor }}>{branding.businessName.charAt(0)}</div>}
                  <span className="text-xs font-semibold text-gray-700 line-clamp-1">{branding.businessName}</span>
                </div>

                <div>
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Subscribe to</p>
                  <p className="text-lg font-bold text-gray-900 leading-tight">{plan.name}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-1">
                    {plan.isFree ? "Free" : `£${plan.price.toFixed(2)}`}
                    {!plan.isFree && <span className="text-sm font-normal text-gray-500 ml-1">/{INTERVAL_LABELS[plan.interval] || "month"}</span>}
                  </p>
                </div>

                {plan.description && (
                  <p className="text-[10px] text-gray-500 border-t pt-3">{plan.description}</p>
                )}

                <div className="border-t pt-3 space-y-1.5">
                  <p className="text-[10px] font-semibold text-gray-600 uppercase tracking-wide mb-2">What's included</p>
                  {plan.features.slice(0, 8).map(key => {
                    const f = FEATURES.find(f => f.key === key);
                    return f ? (
                      <div key={key} className="flex items-center gap-1.5 text-[10px] text-gray-600">
                        <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                        {f.label}
                      </div>
                    ) : null;
                  })}
                  {plan.features.length > 8 && (
                    <p className="text-[10px] text-gray-400 pl-4">+{plan.features.length - 8} more features</p>
                  )}
                </div>

                <div className="border-t pt-3 space-y-1">
                  <div className="flex justify-between text-xs font-semibold text-gray-800">
                    <span>Total due today</span>
                    <span>{plan.isFree ? "£0.00" : `£${plan.price.toFixed(2)}`}</span>
                  </div>
                  <div className="flex items-center gap-1 text-[10px] text-violet-600">
                    <Repeat className="h-3 w-3" />
                    Renews every {INTERVAL_LABELS[plan.interval] || "month"} — cancel anytime
                  </div>
                </div>

                <div className="flex items-center gap-1 text-[9px] text-gray-400 pt-1">
                  <Lock className="h-2.5 w-2.5" /> Secured by <span className="font-semibold text-gray-500 ml-0.5">Stripe</span>
                </div>
              </div>

              {/* Right — payment form mock */}
              <div className="flex-1 p-5 space-y-4">
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Contact</p>
                  <div className="h-8 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3">
                    <span className="text-xs text-gray-400">Email address</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Card information</p>
                  <div className="h-8 bg-gray-100 rounded-t-lg border border-gray-200 flex items-center px-3 justify-between">
                    <span className="text-xs text-gray-400">1234 1234 1234 1234</span>
                    <div className="flex gap-1">
                      {["bg-blue-500","bg-red-500","bg-yellow-400","bg-orange-500"].map((c,i) => <div key={i} className={`h-3.5 w-5 rounded-sm ${c} opacity-60`} />)}
                    </div>
                  </div>
                  <div className="flex">
                    <div className="flex-1 h-8 bg-gray-100 rounded-bl-lg border-b border-l border-gray-200 flex items-center px-3"><span className="text-xs text-gray-400">MM / YY</span></div>
                    <div className="flex-1 h-8 bg-gray-100 rounded-br-lg border-b border-r border-l border-gray-200 flex items-center px-3"><span className="text-xs text-gray-400">CVC</span></div>
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-semibold text-gray-500 uppercase tracking-wide">Name on card</p>
                  <div className="h-8 bg-gray-100 rounded-lg border border-gray-200 flex items-center px-3"><span className="text-xs text-gray-400">Full name</span></div>
                </div>
                <button
                  disabled
                  className="w-full h-10 rounded-xl text-white text-sm font-semibold flex items-center justify-center gap-2 mt-2 cursor-not-allowed opacity-90"
                  style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                >
                  <Lock className="h-3.5 w-3.5" />
                  {plan.isFree ? "Start Free Membership" : `Subscribe — £${plan.price.toFixed(2)}/${INTERVAL_LABELS[plan.interval] || "month"}`}
                </button>
                <p className="text-[9px] text-center text-gray-400">
                  By subscribing you agree to the terms. Cancel anytime from your account.
                </p>
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 bg-violet-50 border border-violet-200 rounded-xl">
            <p className="text-xs text-violet-700 font-medium">Preview only — this is a visual mock of the Stripe checkout experience.</p>
            <p className="text-[10px] text-violet-600 mt-0.5">The real checkout uses your Stripe branding settings (logo, colours) configured in Stripe Dashboard.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
