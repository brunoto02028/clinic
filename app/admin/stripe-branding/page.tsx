"use client";

import { useState, useEffect } from "react";
import {
  CreditCard, Palette, Eye, Save, Loader2, CheckCircle,
  AlertCircle, RefreshCw, ExternalLink, Lock, Shield,
  Building2, Mail, Phone, Globe, ChevronRight,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface BrandingState {
  primaryColor: string;
  secondaryColor: string;
  businessName: string;
  supportEmail: string;
  supportPhone: string;
  websiteUrl: string;
  logoUrl: string;
}

export default function StripeBrandingPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [siteLogoUrl, setSiteLogoUrl] = useState("");
  const [branding, setBranding] = useState<BrandingState>({
    primaryColor: "#5dc9c0",
    secondaryColor: "#1a6b6b",
    businessName: "Bruno Physical Rehabilitation",
    supportEmail: "",
    supportPhone: "",
    websiteUrl: "https://bpr.rehab",
    logoUrl: "",
  });

  useEffect(() => {
    fetchBranding();
  }, []);

  const fetchBranding = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/stripe-branding");
      const data = await res.json();
      if (res.ok) {
        setBranding({
          primaryColor: data.branding?.primaryColor || "#5dc9c0",
          secondaryColor: data.branding?.secondaryColor || "#1a6b6b",
          businessName: data.businessProfile?.name || "Bruno Physical Rehabilitation",
          supportEmail: data.businessProfile?.supportEmail || "",
          supportPhone: data.businessProfile?.supportPhone || "",
          websiteUrl: data.businessProfile?.url || "",
          logoUrl: data.branding?.logoUrl || "",
        });
        setSiteLogoUrl(data.siteSettings?.logoUrl || "");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/stripe-branding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(branding),
      });
      const data = await res.json();
      if (data.success) {
        toast({ title: "Stripe branding updated! ✅", description: "Changes will appear on the next checkout." });
      } else {
        toast({ title: "Error", description: data.error || "Failed to update", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save branding", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const logoToShow = siteLogoUrl || branding.logoUrl;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span className="ml-2 text-muted-foreground">Loading Stripe settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <CreditCard className="h-6 w-6 text-[#5dc9c0]" />
            Stripe Branding & Checkout
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure how your brand appears on Stripe payment pages. Changes apply to all future checkouts.
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={fetchBranding}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg border text-sm hover:bg-muted transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white disabled:opacity-50 hover:opacity-90 transition-opacity"
            style={{ background: "linear-gradient(135deg,#5dc9c0 0%,#1a6b6b 100%)" }}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            {saving ? "Saving..." : "Save to Stripe"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* LEFT: Settings */}
        <div className="space-y-5">
          {/* Brand Colors */}
          <div className="border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Palette className="h-4 w-4 text-[#5dc9c0]" /> Brand Colours
            </h2>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Primary Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.primaryColor}
                    onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                    className="w-12 h-10 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.primaryColor}
                    onChange={e => setBranding(b => ({ ...b, primaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg font-mono"
                    placeholder="#5dc9c0"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Used for buttons and accents</p>
              </div>
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Secondary Colour</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={branding.secondaryColor}
                    onChange={e => setBranding(b => ({ ...b, secondaryColor: e.target.value }))}
                    className="w-12 h-10 rounded-lg border cursor-pointer"
                  />
                  <input
                    type="text"
                    value={branding.secondaryColor}
                    onChange={e => setBranding(b => ({ ...b, secondaryColor: e.target.value }))}
                    className="flex-1 px-3 py-2 text-sm border rounded-lg font-mono"
                    placeholder="#1a6b6b"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">Used for hover states</p>
              </div>
            </div>
            <div className="bg-muted/30 rounded-xl p-3 text-xs text-muted-foreground flex items-start gap-2">
              <AlertCircle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
              Your logo is automatically synced from Admin → Settings. The logo shown on Stripe checkout is the one configured there.
            </div>
          </div>

          {/* Business Profile */}
          <div className="border rounded-2xl p-5 space-y-4">
            <h2 className="font-semibold flex items-center gap-2 text-sm">
              <Building2 className="h-4 w-4 text-[#5dc9c0]" /> Business Profile
            </h2>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Business Name</label>
                <input
                  type="text"
                  value={branding.businessName}
                  onChange={e => setBranding(b => ({ ...b, businessName: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                  placeholder="Bruno Physical Rehabilitation"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Mail className="h-3 w-3" /> Support Email
                  </label>
                  <input
                    type="email"
                    value={branding.supportEmail}
                    onChange={e => setBranding(b => ({ ...b, supportEmail: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                    placeholder="info@clinic.co.uk"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                    <Phone className="h-3 w-3" /> Support Phone
                  </label>
                  <input
                    type="tel"
                    value={branding.supportPhone}
                    onChange={e => setBranding(b => ({ ...b, supportPhone: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                    placeholder="+44 20 1234 5678"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-1">
                  <Globe className="h-3 w-3" /> Website URL
                </label>
                <input
                  type="url"
                  value={branding.websiteUrl}
                  onChange={e => setBranding(b => ({ ...b, websiteUrl: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-1 focus:ring-[#5dc9c0]"
                  placeholder="https://bpr.rehab"
                />
              </div>
            </div>
          </div>

          {/* Cancellation Policy Info */}
          <div className="border rounded-2xl p-5 space-y-3 bg-amber-50/50 border-amber-200">
            <h2 className="font-semibold flex items-center gap-2 text-sm text-amber-800">
              <Shield className="h-4 w-4" /> Cancellation Policy (shown at checkout)
            </h2>
            <div className="space-y-2 text-xs text-amber-700">
              <div className="flex gap-2">
                <span className="font-bold">Appointments:</span>
                <span>Free cancellation up to 48 hours before. No refund within 48 hours.</span>
              </div>
              <div className="flex gap-2">
                <span className="font-bold">Treatment Plans:</span>
                <span>Requires admin review. No automatic self-service cancellation.</span>
              </div>
            </div>
            <a
              href="/cancellation-policy"
              target="_blank"
              className="inline-flex items-center gap-1 text-xs text-amber-700 underline hover:no-underline"
            >
              View public policy page <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>

        {/* RIGHT: Live Preview */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Eye className="h-4 w-4 text-[#5dc9c0]" />
            <h2 className="font-semibold text-sm">Live Checkout Preview</h2>
            <span className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Simulated</span>
          </div>

          {/* Stripe Checkout Mock */}
          <div className="border-2 border-gray-200 rounded-2xl overflow-hidden shadow-lg bg-white">
            {/* Stripe top bar */}
            <div className="h-1.5 w-full" style={{ background: `linear-gradient(90deg, ${branding.primaryColor}, ${branding.secondaryColor})` }} />

            <div className="flex">
              {/* Left panel — order summary */}
              <div className="w-2/5 bg-gray-50 p-5 border-r space-y-4">
                {/* Logo */}
                <div className="flex items-center gap-2">
                  {logoToShow ? (
                    <img src={logoToShow} alt={branding.businessName} className="h-8 w-auto object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded-lg flex items-center justify-center text-white text-xs font-bold" style={{ background: branding.primaryColor }}>
                      {branding.businessName.charAt(0)}
                    </div>
                  )}
                  <span className="text-xs font-semibold text-gray-700 line-clamp-1">{branding.businessName}</span>
                </div>

                {/* Product */}
                <div className="space-y-1">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">Pay</p>
                  <p className="text-2xl font-bold text-gray-900">£120.00</p>
                </div>

                <div className="border-t pt-3 space-y-2">
                  <div className="flex justify-between text-xs text-gray-600">
                    <span>Physiotherapy Assessment</span>
                    <span>£120.00</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500 italic">
                    <span>Monday, 24 Feb 2025 at 10:00</span>
                  </div>
                  <div className="text-[10px] text-green-600 flex items-center gap-1 mt-1">
                    <CheckCircle className="h-3 w-3" />
                    Free cancellation up to 48 hours before
                  </div>
                </div>

                <div className="border-t pt-3 flex justify-between text-xs font-semibold text-gray-800">
                  <span>Total due</span>
                  <span>£120.00</span>
                </div>

                {/* Powered by Stripe */}
                <div className="flex items-center gap-1 text-[9px] text-gray-400 mt-2">
                  <Lock className="h-2.5 w-2.5" />
                  Powered by <span className="font-semibold text-gray-500">Stripe</span>
                </div>
              </div>

              {/* Right panel — payment form */}
              <div className="flex-1 p-5 space-y-4">
                <p className="text-xs font-semibold text-gray-700">Contact information</p>

                {/* Email */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Email</label>
                  <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">patient@email.com</div>
                </div>

                {/* Full Name (custom field) */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Full Name <span className="text-red-400">*</span></label>
                  <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">John Smith</div>
                </div>

                {/* Phone */}
                <div className="space-y-1">
                  <label className="text-[10px] text-gray-500">Phone number <span className="text-red-400">*</span></label>
                  <div className="border rounded-lg px-3 py-2 text-xs text-gray-400 bg-gray-50">+44 7700 900000</div>
                </div>

                <p className="text-xs font-semibold text-gray-700 pt-1">Card information</p>

                {/* Card */}
                <div className="border rounded-lg overflow-hidden">
                  <div className="px-3 py-2 text-xs text-gray-400 bg-gray-50 flex items-center justify-between border-b">
                    <span>1234 1234 1234 1234</span>
                    <CreditCard className="h-3.5 w-3.5 text-gray-300" />
                  </div>
                  <div className="flex">
                    <div className="flex-1 px-3 py-2 text-xs text-gray-400 bg-gray-50 border-r">MM / YY</div>
                    <div className="flex-1 px-3 py-2 text-xs text-gray-400 bg-gray-50">CVC</div>
                  </div>
                </div>

                {/* Billing Address */}
                <p className="text-xs font-semibold text-gray-700">Billing address <span className="text-red-400">*</span></p>
                <div className="border rounded-lg overflow-hidden text-xs text-gray-400">
                  <div className="px-3 py-2 bg-gray-50 border-b">United Kingdom</div>
                  <div className="px-3 py-2 bg-gray-50 border-b">Address line 1</div>
                  <div className="px-3 py-2 bg-gray-50 border-b">City</div>
                  <div className="px-3 py-2 bg-gray-50">Postcode</div>
                </div>

                {/* Terms */}
                <div className="flex gap-2 items-start">
                  <div className="w-3.5 h-3.5 border-2 rounded mt-0.5 shrink-0" style={{ borderColor: branding.primaryColor }} />
                  <p className="text-[9px] text-gray-500 leading-relaxed">
                    By completing this payment you agree to our{" "}
                    <span className="underline" style={{ color: branding.primaryColor }}>Cancellation Policy</span>:
                    appointments cancelled within 48 hours are non-refundable.
                  </p>
                </div>

                {/* Pay button */}
                <button
                  className="w-full py-2.5 rounded-lg text-white text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
                  style={{ background: `linear-gradient(135deg, ${branding.primaryColor}, ${branding.secondaryColor})` }}
                >
                  <Lock className="h-3.5 w-3.5" />
                  Pay £120.00
                </button>

                <p className="text-[9px] text-gray-400 text-center">
                  Your payment is secured by Stripe. We'll send a confirmation email.
                </p>
              </div>
            </div>
          </div>

          {/* Fields summary */}
          <div className="border rounded-xl p-4 space-y-2 bg-muted/20">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Fields collected at checkout</p>
            <div className="grid grid-cols-2 gap-1.5">
              {[
                { label: "Email", required: true },
                { label: "Full Name", required: true },
                { label: "Phone Number", required: true },
                { label: "Billing Address", required: true },
                { label: "Card Details", required: true },
                { label: "Cancellation Policy Acceptance", required: true },
              ].map(f => (
                <div key={f.label} className="flex items-center gap-1.5 text-xs">
                  <CheckCircle className="h-3 w-3 text-green-500 shrink-0" />
                  <span>{f.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
