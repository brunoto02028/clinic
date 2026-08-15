"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { signIn, useSession } from "next-auth/react";
import {
  ShoppingCart, Star, Package, ExternalLink, Loader2,
  Search, X, User, LogIn, UserPlus, CheckCircle,
  Zap, Video, Box, Crown, Shield, Truck, Award,
  ChevronRight, Sparkles, Heart, Plus, Minus, Trash2,
  MapPin, CreditCard, ArrowRight,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/ui/logo";

type CartItem = { productId: string; name: string; price: number; imageUrl?: string; quantity: number; isAffiliate?: boolean; affiliateUrl?: string; amazonAsin?: string; };

const getProductImage = (product: any): string | null => {
  if (product.imageUrl && product.imageUrl.length > 10 && !product.imageUrl.includes('PLACEHOLDER')) return product.imageUrl;
  return null;
};
type CheckoutStep = "cart" | "shipping" | "done";

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; icon: any; color: string; bg: string }> = {
  toe_support:      { label: "Toe Spacers & Support",     emoji: "🦶", icon: Package, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  arch_heel:        { label: "Arch & Heel Support",       emoji: "�", icon: Box,     color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/20" },
  recovery_kits:    { label: "Recovery Kits",             emoji: "📦", icon: Crown,   color: "text-violet-400", bg: "bg-violet-500/10 border-violet-500/20" },
  massage_tools:    { label: "Massage & Mobility Tools",  emoji: "🛠️", icon: Heart,   color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/20" },
  custom_insoles:   { label: "Custom Insoles",            emoji: "⚡", icon: Zap,     color: "text-amber-400",  bg: "bg-amber-500/10 border-amber-500/20" },
  guides_education: { label: "Guides & Education",        emoji: "📚", icon: Video,   color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/20" },
};

const HERO_SLIDES = [
  {
    image: "https://images.unsplash.com/photo-1516574187841-cb9cc2ca948b?w=1920&q=90&auto=format&fit=crop&crop=center",
    tag1: "3D Printed In-House", tag2: "Clinically Designed",
    title: "3D Printed Foot Care", highlight: "for Real Recovery",
    sub: "Toe spacers, arch supports, heel lifts and recovery kits designed by physiotherapists. Made in-house with medical-grade materials for plantar fasciitis, bunions and daily comfort.",
  },
  {
    image: "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=1920&q=90&auto=format&fit=crop&crop=center",
    tag1: "Custom Solutions", tag2: "Printed to Order",
    title: "From Support Tools to", highlight: "Custom Insoles",
    sub: "Start with ready-made arch supports and toe spacers, then upgrade to semi-custom or fully personalized 3D printed insoles based on clinical assessment.",
  },
  {
    image: "https://images.unsplash.com/photo-1598970434795-0c54fe7c0642?w=1920&q=90&auto=format&fit=crop&crop=center",
    tag1: "Clinical Quality", tag2: "Affordable Access",
    title: "Professional Grade", highlight: "Foot Support Products",
    sub: "Skip generic retail products. Get clinically informed 3D printed supports, massage tools and recovery kits designed for real biomechanical needs.",
  },
];

type AuthMode = "idle" | "login" | "register";

export default function ShopPage() {
  const { data: session } = useSession();
  const [settings, setSettings] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [authMode, setAuthMode] = useState<AuthMode>("idle");
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", password: "" });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");
  const router = useRouter();
  // ── Cart state ──
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>("cart");
  const [shipping, setShipping] = useState({ name: "", address: "", city: "", postcode: "", country: "UK", phone: "", email: "" });
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutDone, setCheckoutDone] = useState<any>(null);
  const [addedId, setAddedId] = useState<string | null>(null);
  const [heroSlide, setHeroSlide] = useState(0);
  const [heroTransition, setHeroTransition] = useState(true);

  const nextSlide = useCallback(() => {
    setHeroTransition(false);
    setTimeout(() => {
      setHeroSlide((s) => (s + 1) % HERO_SLIDES.length);
      setHeroTransition(true);
    }, 150);
  }, []);

  useEffect(() => {
    const t = setInterval(nextSlide, 5000);
    return () => clearInterval(t);
  }, [nextSlide]);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.ok ? r.json() : null)
      .then((d) => d && setSettings(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((d) => { setProducts(d.products || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const res = await fetch("/api/shop/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Registration failed");
      setAuthSuccess("Account created! Signing you in...");
      await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      setAuthMode("idle");
    } catch (e: any) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true); setAuthError(""); setAuthSuccess("");
    try {
      const result = await signIn("credentials", { email: form.email, password: form.password, redirect: false });
      if (result?.error) throw new Error("Invalid email or password");
      setAuthMode("idle");
    } catch (e: any) { setAuthError(e.message); }
    finally { setAuthLoading(false); }
  };

  // ── Cart helpers ──
  const addToCart = (product: any) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.productId === product.id);
      if (existing) return prev.map((i) => i.productId === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { productId: product.id, name: product.name, price: Number(product.price), imageUrl: product.imageUrl, quantity: 1, isAffiliate: product.isAffiliate, affiliateUrl: product.affiliateUrl, amazonAsin: product.amazonAsin }];
    });
    setAddedId(product.id);
    setTimeout(() => setAddedId(null), 1500);
    setCartOpen(true);
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => i.productId === productId ? { ...i, quantity: Math.max(1, i.quantity + delta) } : i));
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.productId !== productId));
  };

  const cartTotal = cart.reduce((s, i) => s + i.price * i.quantity, 0);
  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const handleCheckout = async () => {
    const nonAffiliate = cart.filter((i) => !i.isAffiliate);
    const affiliate = cart.filter((i) => i.isAffiliate);

    // Open affiliate items in Amazon
    for (const item of affiliate) {
      const url = item.affiliateUrl || (item.amazonAsin ? `https://www.amazon.co.uk/dp/${item.amazonAsin}?tag=bprrrehab-21` : null);
      if (url) window.open(url, "_blank");
    }

    if (nonAffiliate.length === 0) { setCart([]); setCartOpen(false); return; }

    setCheckoutLoading(true);
    try {
      const res = await fetch("/api/shop/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: nonAffiliate.map((i) => ({ productId: i.productId, quantity: i.quantity })),
          shippingInfo: shipping,
          email: shipping.email || session?.user?.email,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Checkout failed");
      if (data.stripeUrl) {
        window.location.href = data.stripeUrl;
      } else {
        setCheckoutDone(data.order);
        setCheckoutStep("done");
        setCart([]);
      }
    } catch (e: any) {
      alert(e.message);
    } finally { setCheckoutLoading(false); }
  };

  const trackAndOpen = async (product: any) => {
    try {
      await fetch("/api/patient/marketplace/affiliate-click", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: product.id }),
      });
    } catch {}
    const url = product.affiliateUrl || (product.amazonAsin ? `https://www.amazon.co.uk/dp/${product.amazonAsin}?tag=bprrrehab-21` : null);
    if (url) window.open(url, "_blank");
  };

  const presentCategories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  const filtered = products.filter((p) => {
    const matchCat = activeCategory === "all" || p.category === activeCategory;
    const q = search.toLowerCase();
    const matchSearch = !q || p.name.toLowerCase().includes(q) || (p.shortDescription || "").toLowerCase().includes(q);
    return matchCat && matchSearch;
  });

  const featuredProducts = products.filter((p) => p.featured).slice(0, 3);

  return (
    <div className="min-h-screen bg-background">

      {/* ── Sticky Header ── */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-4">
          <a href="https://bpr.clinic" className="flex items-center gap-2.5 shrink-0">
            <Logo
              logoUrl={settings?.screenLogos?.landingHeader?.logoUrl || settings?.logoUrl}
              darkLogoUrl={settings?.screenLogos?.landingHeader?.darkLogoUrl || settings?.darkLogoUrl}
              size="md"
              linkTo=""
            />
          </a>

          <div className="relative flex-1 max-w-lg mx-auto">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search 3D foot care, rehab tools, custom products..."
              className="pl-9 h-9 text-sm bg-muted/50 border-white/10 focus:border-teal-500/50 rounded-full" />
            {search && (
              <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {/* Cart button */}
            <button
              onClick={() => { setCartOpen(true); setCheckoutStep("cart"); }}
              className="relative flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-white/10 bg-muted/40 hover:bg-muted/70 transition-all">
              <ShoppingCart className="h-4 w-4 text-foreground" />
              <span className="text-xs font-semibold text-foreground hidden sm:inline">Cart</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-teal-500 text-white text-[10px] font-black flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </button>

            {session ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground hidden sm:inline">
                  Hi, <span className="font-semibold text-foreground">{(session.user as any)?.firstName || "there"}</span>
                </span>
                <div className="w-8 h-8 rounded-full bg-teal-500/20 border border-teal-500/30 flex items-center justify-center">
                  <User className="h-4 w-4 text-teal-400" />
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <Button size="sm" variant="ghost" className="h-8 text-xs gap-1.5"
                  onClick={() => { setAuthMode("login"); setAuthError(""); }}>
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Button>
                <Button size="sm" className="h-8 text-xs gap-1.5 bg-teal-600 hover:bg-teal-500 text-white rounded-full"
                  onClick={() => { setAuthMode("register"); setAuthError(""); }}>
                  <UserPlus className="h-3.5 w-3.5" /> Register
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Cart Drawer ── */}
      {cartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCartOpen(false)} />
          <div className="relative w-full max-w-md bg-background border-l border-white/10 flex flex-col h-full shadow-2xl">

            {/* Cart header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
              <div className="flex items-center gap-2">
                <ShoppingCart className="h-5 w-5 text-teal-400" />
                <h2 className="font-black text-foreground">
                  {checkoutStep === "cart" ? `Your Cart (${cartCount})` : checkoutStep === "shipping" ? "Delivery Details" : "Order Confirmed"}
                </h2>
              </div>
              <button onClick={() => setCartOpen(false)} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* ── Step: Cart ── */}
            {checkoutStep === "cart" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {cart.length === 0 ? (
                  <div className="text-center py-16 space-y-3">
                    <ShoppingCart className="h-12 w-12 text-muted-foreground/20 mx-auto" />
                    <p className="text-muted-foreground text-sm">Your cart is empty</p>
                    <Button size="sm" variant="outline" onClick={() => setCartOpen(false)}>Continue Shopping</Button>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl bg-muted/30 border border-white/5">
                      {item.imageUrl ? (
                        <img src={item.imageUrl} alt="" className="w-14 h-14 rounded-lg object-contain bg-muted shrink-0" />
                      ) : (
                        <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center shrink-0">
                          <Package className="h-6 w-6 text-muted-foreground/30" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{item.name}</p>
                        <p className="text-xs text-muted-foreground">£{item.price.toFixed(2)} each</p>
                        {item.isAffiliate && <p className="text-[10px] text-orange-400">Opens on Amazon</p>}
                      </div>
                      <div className="flex flex-col items-end gap-1.5">
                        <p className="text-sm font-black text-foreground">£{(item.price * item.quantity).toFixed(2)}</p>
                        <div className="flex items-center gap-1">
                          <button onClick={() => updateQty(item.productId, -1)}
                            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/70">
                            <Minus className="h-3 w-3" />
                          </button>
                          <span className="w-6 text-center text-xs font-bold">{item.quantity}</span>
                          <button onClick={() => updateQty(item.productId, 1)}
                            className="w-6 h-6 rounded-md bg-muted flex items-center justify-center hover:bg-muted/70">
                            <Plus className="h-3 w-3" />
                          </button>
                          <button onClick={() => removeFromCart(item.productId)}
                            className="w-6 h-6 rounded-md bg-red-500/10 flex items-center justify-center hover:bg-red-500/20 ml-1">
                            <Trash2 className="h-3 w-3 text-red-400" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* ── Step: Shipping ── */}
            {checkoutStep === "shipping" && (
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                <p className="text-xs text-muted-foreground">Enter your delivery details for the BPR products in your cart.</p>
                {["name", "address", "city", "postcode", "phone", "email"].map((field) => (
                  <div key={field}>
                    <label className="text-[10px] text-muted-foreground capitalize">{field === "postcode" ? "Postcode" : field.charAt(0).toUpperCase() + field.slice(1)}</label>
                    <Input
                      value={(shipping as any)[field]}
                      onChange={(e) => setShipping({ ...shipping, [field]: e.target.value })}
                      placeholder={field === "name" ? "Full name" : field === "email" ? "Email address" : field === "phone" ? "Phone number" : field === "address" ? "Street address" : field === "city" ? "City" : "Postcode"}
                      type={field === "email" ? "email" : "text"}
                      className="h-9 text-sm mt-0.5"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* ── Step: Done ── */}
            {checkoutStep === "done" && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center">
                  <CheckCircle className="h-8 w-8 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-black text-foreground">Order Placed!</h3>
                  <p className="text-sm text-muted-foreground mt-1">Order {checkoutDone?.orderNumber}</p>
                  <p className="text-xs text-muted-foreground mt-2">You'll receive a confirmation shortly.</p>
                </div>
                <Button onClick={() => { setCartOpen(false); setCheckoutStep("cart"); }} className="bg-teal-600 hover:bg-teal-500">
                  Continue Shopping
                </Button>
              </div>
            )}

            {/* Cart footer */}
            {checkoutStep !== "done" && cart.length > 0 && (
              <div className="border-t border-white/10 p-4 space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">£{cartTotal.toFixed(2)}</span>
                  </div>
                  {checkoutStep === "shipping" && !cart.every((i) => i.isAffiliate) && (
                    <>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Payment processing fee</span>
                        <span className="text-muted-foreground">£{((cartTotal * 0.015) + 0.20).toFixed(2)}</span>
                      </div>
                      <div className="flex items-center justify-between pt-2 border-t border-white/5">
                        <span className="font-semibold text-foreground">Total</span>
                        <span className="text-xl font-black text-foreground">£{(cartTotal + (cartTotal * 0.015) + 0.20).toFixed(2)}</span>
                      </div>
                    </>
                  )}
                </div>
                {cart.some((i) => i.isAffiliate) && (
                  <p className="text-[11px] text-orange-400">Amazon items will open in a new tab</p>
                )}
                {checkoutStep === "cart" ? (
                  <button
                    onClick={() => setCheckoutStep("shipping")}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 text-white font-bold transition-all hover:shadow-lg hover:shadow-teal-500/20">
                    <ArrowRight className="h-4 w-4" /> Proceed to Checkout
                  </button>
                ) : (
                  <div className="space-y-2">
                    <button
                      disabled={checkoutLoading || !shipping.name || !shipping.address || !shipping.email}
                      onClick={handleCheckout}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white font-bold transition-all">
                      {checkoutLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {checkoutLoading ? "Processing..." : "Pay Now"}
                    </button>
                    <button onClick={() => setCheckoutStep("cart")}
                      className="w-full text-xs text-muted-foreground hover:text-foreground py-1.5">
                      ← Back to cart
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Auth Modal ── */}
      {authMode !== "idle" && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setAuthMode("idle")}>
          <Card className="w-full max-w-sm border-white/10 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <CardContent className="p-6 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-black text-xl text-foreground">
                    {authMode === "register" ? "Create Account" : "Welcome back"}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {authMode === "register" ? "Join the BPR recovery community" : "Sign in to your BPR account"}
                  </p>
                </div>
                <button onClick={() => setAuthMode("idle")} className="w-8 h-8 rounded-full bg-muted flex items-center justify-center">
                  <X className="h-4 w-4" />
                </button>
              </div>

              {authSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
                  <p className="text-sm text-emerald-400">{authSuccess}</p>
                </div>
              )}
              {authError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20">
                  <p className="text-sm text-red-400">{authError}</p>
                </div>
              )}

              <form onSubmit={authMode === "register" ? handleRegister : handleLogin} className="space-y-3">
                {authMode === "register" && (
                  <div className="grid grid-cols-2 gap-2">
                    <Input placeholder="First name *" value={form.firstName}
                      onChange={(e) => setForm({ ...form, firstName: e.target.value })} required className="text-sm" />
                    <Input placeholder="Last name" value={form.lastName}
                      onChange={(e) => setForm({ ...form, lastName: e.target.value })} className="text-sm" />
                  </div>
                )}
                <Input type="email" placeholder="Email *" value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} required className="text-sm" />
                <Input type="password" placeholder="Password *" value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })} required minLength={6} className="text-sm" />
                <Button type="submit" className="w-full gap-2 bg-teal-600 hover:bg-teal-500 text-white" disabled={authLoading}>
                  {authLoading ? <Loader2 className="h-4 w-4 animate-spin" />
                    : authMode === "register" ? <UserPlus className="h-4 w-4" /> : <LogIn className="h-4 w-4" />}
                  {authMode === "register" ? "Create Account" : "Sign In"}
                </Button>
              </form>

              <p className="text-xs text-center text-muted-foreground">
                {authMode === "register"
                  ? <>Already have an account?{" "}
                      <button className="text-teal-400 underline font-medium"
                        onClick={() => { setAuthMode("login"); setAuthError(""); }}>Sign in</button></>
                  : <>No account?{" "}
                      <button className="text-teal-400 underline font-medium"
                        onClick={() => { setAuthMode("register"); setAuthError(""); }}>Create one free</button></>}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      <main>
        {/* ── Hero Carousel ── */}
        <section className="relative h-[450px] sm:h-[500px] overflow-hidden border-b border-white/5">
          {/* Background image */}
          <img
            src={HERO_SLIDES[heroSlide].image}
            alt=""
            className="absolute inset-0 w-full h-full object-cover transition-opacity duration-700"
            style={{
              opacity: heroTransition ? 1 : 0,
            }}
          />
          {/* Dark overlay gradient */}
          <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/60 to-black/20" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Content */}
          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
            <div className="max-w-2xl">
              <div
                className="flex items-center gap-2 mb-4 transition-all duration-500"
                style={{ opacity: heroTransition ? 1 : 0, transform: heroTransition ? "translateY(0)" : "translateY(8px)" }}
              >
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-teal-500/20 border border-teal-500/30 backdrop-blur-sm">
                  <Sparkles className="h-3 w-3 text-teal-400" />
                  <span className="text-xs font-semibold text-teal-300">{HERO_SLIDES[heroSlide].tag1}</span>
                </div>
                <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 backdrop-blur-sm">
                  <Award className="h-3 w-3 text-amber-400" />
                  <span className="text-xs font-semibold text-amber-300">{HERO_SLIDES[heroSlide].tag2}</span>
                </div>
              </div>

              <h1
                className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight transition-all duration-500"
                style={{ opacity: heroTransition ? 1 : 0, transform: heroTransition ? "translateY(0)" : "translateY(12px)" }}
              >
                {HERO_SLIDES[heroSlide].title}{" "}
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-400 to-cyan-400">
                  {HERO_SLIDES[heroSlide].highlight}
                </span>
              </h1>

              <p
                className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed max-w-xl transition-all duration-500 delay-75"
                style={{ opacity: heroTransition ? 1 : 0, transform: heroTransition ? "translateY(0)" : "translateY(12px)" }}
              >
                {HERO_SLIDES[heroSlide].sub}
              </p>

              <div className="flex flex-wrap gap-3 mt-6">
                {[
                  { icon: Shield, text: "Designed and curated by BPR" },
                  { icon: Truck, text: "Printed to order and shipped by us" },
                  { icon: Star, text: "Focused on practical 3D recovery tools" },
                ].map(({ icon: Icon, text }) => (
                  <div key={text} className="flex items-center gap-1.5 text-sm text-slate-300">
                    <Icon className="h-4 w-4 text-teal-400" />
                    <span>{text}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 mt-6">
                <Button
                  className="gap-2 bg-teal-500 hover:bg-teal-400 text-black font-bold px-6 rounded-full shadow-lg shadow-teal-500/30"
                  onClick={() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" })}>
                  <ShoppingCart className="h-4 w-4" /> Explore Products
                </Button>
                <a href="https://bpr.clinic" className="flex items-center gap-1 text-sm text-slate-400 hover:text-white transition-colors">
                  Visit bpr.clinic <ChevronRight className="h-3.5 w-3.5" />
                </a>
              </div>
            </div>
          </div>

          {/* Slide indicators + nav */}
          <div className="absolute bottom-5 left-1/2 -translate-x-1/2 flex items-center gap-3">
            {HERO_SLIDES.map((_, i) => (
              <button
                key={i}
                onClick={() => { setHeroTransition(false); setTimeout(() => { setHeroSlide(i); setHeroTransition(true); }, 150); }}
                className={`transition-all duration-300 rounded-full ${
                  i === heroSlide ? "w-8 h-2 bg-teal-400" : "w-2 h-2 bg-white/40 hover:bg-white/70"
                }`}
              />
            ))}
          </div>

          {/* Prev / Next arrows */}
          <button
            onClick={() => { setHeroTransition(false); setTimeout(() => { setHeroSlide((s) => (s - 1 + HERO_SLIDES.length) % HERO_SLIDES.length); setHeroTransition(true); }, 150); }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-all">
            <ChevronRight className="h-4 w-4 rotate-180" />
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/30 backdrop-blur-sm border border-white/10 flex items-center justify-center text-white hover:bg-black/50 transition-all">
            <ChevronRight className="h-4 w-4" />
          </button>
        </section>

        {/* ── Trust bar ── */}
        <section className="bg-muted/30 border-b border-white/5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
            {[
              { icon: Shield, text: "In-house BPR product range" },
              { icon: Award, text: "Designed around patient recovery use-cases" },
              { icon: Truck, text: "Printed-to-order physical products" },
              { icon: Star, text: "Small curated add-ons only where useful" },
            ].map(({ icon: Icon, text }) => (
              <div key={text} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Icon className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                <span>{text}</span>
              </div>
            ))}
          </div>
        </section>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10 space-y-10">

          {/* ── Category Cards ── */}
          {presentCategories.length > 1 && (
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-black text-foreground">Shop by Category</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                <button
                  onClick={() => setActiveCategory("all")}
                  className={`p-4 rounded-2xl border text-center transition-all ${
                    activeCategory === "all"
                      ? "bg-teal-500/20 border-teal-500/50 shadow-lg shadow-teal-500/10"
                      : "bg-muted/30 border-white/5 hover:border-white/20"
                  }`}>
                  <div className="text-2xl mb-1">🛍️</div>
                  <p className="text-xs font-semibold text-foreground">All</p>
                  <p className="text-[10px] text-muted-foreground mt-0.5">{products.length} items</p>
                </button>
                {presentCategories.map((cat) => {
                  const config = CATEGORY_CONFIG[cat];
                  const count = products.filter((p) => p.category === cat).length;
                  return (
                    <button key={cat}
                      onClick={() => setActiveCategory(cat)}
                      className={`p-4 rounded-2xl border text-center transition-all ${
                        activeCategory === cat
                          ? `${config?.bg || "bg-muted/50"} shadow-lg`
                          : "bg-muted/30 border-white/5 hover:border-white/20"
                      }`}>
                      <div className="text-2xl mb-1">{config?.emoji || "📦"}</div>
                      <p className={`text-xs font-semibold ${activeCategory === cat ? config?.color : "text-foreground"}`}>
                        {config?.label || cat}
                      </p>
                      <p className="text-[10px] text-muted-foreground mt-0.5">{count} items</p>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ── Products Grid ── */}
          <section id="products">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h2 className="text-lg font-black text-foreground">
                  {activeCategory === "all" ? "All Products" : CATEGORY_CONFIG[activeCategory]?.label || activeCategory}
                  <span className="ml-2 text-sm font-normal text-muted-foreground">({filtered.length})</span>
                </h2>
                {search && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Results for "<span className="text-foreground font-medium">{search}</span>"
                    {" "}<button className="text-teal-400 underline" onClick={() => setSearch("")}>clear</button>
                  </p>
                )}
              </div>
            </div>

            {loading ? (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {[...Array(8)].map((_, i) => (
                  <div key={i} className="rounded-2xl bg-muted/30 h-80 animate-pulse" />
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="text-center py-20 space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-muted/50 flex items-center justify-center mx-auto">
                  <Package className="h-8 w-8 text-muted-foreground/40" />
                </div>
                <p className="font-semibold text-foreground">No products found</p>
                <p className="text-sm text-muted-foreground">
                  {search ? `No results for "${search}"` : "No products in this category yet"}
                </p>
                {(search || activeCategory !== "all") && (
                  <Button variant="outline" size="sm" onClick={() => { setSearch(""); setActiveCategory("all"); }}>
                    View all products
                  </Button>
                )}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {filtered.map((product) => {
                  const config = CATEGORY_CONFIG[product.category];
                  const CatIcon = config?.icon || Package;
                  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
                  const discountPct = hasDiscount
                    ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

                  return (
                    <Card key={product.id}
                      className="flex flex-col overflow-hidden border-white/8 hover:border-teal-500/30 hover:shadow-xl hover:shadow-teal-500/5 transition-all duration-300 group rounded-2xl bg-card">

                      {/* Image area — clickable to product page */}
                      <div className="relative h-48 bg-gradient-to-br from-muted/50 to-muted/20 overflow-hidden flex items-center justify-center cursor-pointer"
                        onClick={() => router.push(`/shop/product/${product.slug || product.id}`)}>
                        {product.featured && (
                          <div className="absolute top-3 left-3 z-10">
                            <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-400 text-black text-[10px] font-black">
                              <Star className="h-2.5 w-2.5" /> Featured
                            </div>
                          </div>
                        )}
                        {hasDiscount && (
                          <div className="absolute top-3 right-3 z-10">
                            <div className="px-2 py-0.5 rounded-full bg-red-500 text-white text-[10px] font-black">
                              -{discountPct}%
                            </div>
                          </div>
                        )}
                        {getProductImage(product) ? (
                          <img src={getProductImage(product)!} alt={product.name}
                            className="w-full h-full object-contain p-3 group-hover:scale-105 transition-transform duration-500"
                            onError={(e) => {
                              const el = e.target as HTMLImageElement;
                              el.style.display = "none";
                              el.parentElement?.querySelector('.fallback-icon')?.classList.remove('hidden');
                            }} />
                        ) : null}
                        <CatIcon className={`h-16 w-16 text-muted-foreground/20 fallback-icon ${getProductImage(product) ? 'hidden' : ''}`} />
                        {/* Overlay gradient */}
                        <div className="absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-card to-transparent" />
                      </div>

                      <CardContent className="p-4 flex-1 flex flex-col gap-2.5">
                        {/* Category badge */}
                        <div className="flex items-center justify-between">
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${config?.bg || "bg-muted"} ${config?.color || "text-muted-foreground"}`}>
                            {config?.emoji} {config?.label || product.category}
                          </span>
                          {product.isAffiliate && (
                            <span className="text-[9px] text-slate-500 flex items-center gap-0.5">
                              via Amazon
                            </span>
                          )}
                        </div>

                        {/* Name */}
                        <h3 className="font-bold text-foreground text-sm leading-snug line-clamp-2 group-hover:text-teal-400 transition-colors">
                          {product.name}
                        </h3>

                        {/* Description */}
                        {(product.shortDescription || product.description) && (
                          <p className="text-[11px] text-muted-foreground line-clamp-2 leading-relaxed flex-1">
                            {product.shortDescription || product.description}
                          </p>
                        )}

                        <div className="flex flex-wrap gap-1.5">
                          {!product.isAffiliate && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-teal-500/10 border border-teal-500/20 text-teal-300">
                              BPR made
                            </span>
                          )}
                          {!product.isDigital && !product.isAffiliate && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300">
                              Printed to order
                            </span>
                          )}
                          {product.category === "special_session" && (
                            <span className="text-[9px] px-2 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-300">
                              Custom pathway
                            </span>
                          )}
                        </div>

                        {/* Price */}
                        <div className="flex items-baseline gap-2 mt-auto">
                          <span className="text-xl font-black text-foreground">
                            £{Number(product.price).toFixed(2)}
                          </span>
                          {hasDiscount && (
                            <span className="text-xs text-muted-foreground line-through">
                              £{Number(product.compareAtPrice).toFixed(2)}
                            </span>
                          )}
                        </div>

                        {/* CTA */}
                        {product.isAffiliate ? (
                          <button
                            onClick={() => trackAndOpen(product)}
                            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#FF9900] hover:bg-[#e88a00] text-black text-xs font-black transition-all hover:shadow-lg hover:shadow-amber-500/20 active:scale-95">
                            <ExternalLink className="h-3.5 w-3.5" />
                            Buy on Amazon
                          </button>
                        ) : (
                          <button
                            onClick={() => addToCart(product)}
                            className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all active:scale-95 ${
                              addedId === product.id
                                ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/20"
                                : "bg-teal-600 hover:bg-teal-500 text-white hover:shadow-lg hover:shadow-teal-500/20"
                            }`}>
                            {addedId === product.id
                              ? <><CheckCircle className="h-3.5 w-3.5" /> Added!</>
                              : <><ShoppingCart className="h-3.5 w-3.5" /> Add to Cart</>}
                          </button>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </section>

          {/* ── CTA Banner ── */}
          {!session && (
            <section className="rounded-3xl overflow-hidden bg-gradient-to-r from-teal-900/80 to-cyan-900/80 border border-teal-500/20 p-8 text-center space-y-4">
              <div className="w-12 h-12 rounded-2xl bg-teal-500/20 border border-teal-500/30 flex items-center justify-center mx-auto">
                <UserPlus className="h-6 w-6 text-teal-400" />
              </div>
              <div>
                <h3 className="text-xl font-black text-white">Join BPR 3D Shop</h3>
                <p className="text-sm text-slate-300 mt-1 max-w-md mx-auto">
                  Create a free account to track your printed orders, save your favourites and access future custom product pathways.
                </p>
              </div>
              <Button
                className="bg-teal-500 hover:bg-teal-400 text-black font-bold px-8 rounded-full shadow-lg shadow-teal-500/30"
                onClick={() => { setAuthMode("register"); setAuthError(""); }}>
                Create Free Account
              </Button>
            </section>
          )}
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-white/5 bg-muted/20 mt-10">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 py-12">
            {/* Main Footer Content */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
              {/* Brand Column */}
              <div className="space-y-4">
                <div className="flex items-center gap-2.5">
                  <Logo size="sm" />
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  3D printed foot care products designed by physiotherapists for real recovery results.
                </p>
                <div className="flex items-center gap-3">
                  <a href="https://www.instagram.com/bprehabilitation/" target="_blank" rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="w-8 h-8 rounded-lg bg-muted/50 hover:bg-muted flex items-center justify-center transition-colors">
                    <span className="text-sm">📷</span>
                  </a>
                </div>
              </div>

              {/* Shop Column */}
              <div>
                <h4 className="font-bold text-sm text-foreground mb-3">Shop</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><button onClick={() => setActiveCategory("all")} className="hover:text-foreground transition-colors">All Products</button></li>
                  <li><button onClick={() => setActiveCategory("toe_support")} className="hover:text-foreground transition-colors">Toe Support</button></li>
                  <li><button onClick={() => setActiveCategory("arch_heel")} className="hover:text-foreground transition-colors">Arch & Heel</button></li>
                  <li><button onClick={() => setActiveCategory("recovery_kits")} className="hover:text-foreground transition-colors">Recovery Kits</button></li>
                  <li><button onClick={() => setActiveCategory("massage_tools")} className="hover:text-foreground transition-colors">Massage Tools</button></li>
                </ul>
              </div>

              {/* Support Column */}
              <div>
                <h4 className="font-bold text-sm text-foreground mb-3">Support</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><a href="https://bpr.clinic/contact" className="hover:text-foreground transition-colors">Contact Us</a></li>
                  <li><a href="https://bpr.clinic" className="hover:text-foreground transition-colors">About BPR</a></li>
                  <li><a href="/shop?help=shipping" className="hover:text-foreground transition-colors">Shipping Info</a></li>
                  <li><a href="/shop?help=returns" className="hover:text-foreground transition-colors">Returns & Refunds</a></li>
                  <li><a href="/shop?help=faq" className="hover:text-foreground transition-colors">FAQ</a></li>
                </ul>
              </div>

              {/* Legal Column */}
              <div>
                <h4 className="font-bold text-sm text-foreground mb-3">Legal</h4>
                <ul className="space-y-2 text-xs text-muted-foreground">
                  <li><a href="https://bpr.clinic/privacy" className="hover:text-foreground transition-colors">Privacy Policy</a></li>
                  <li><a href="https://bpr.clinic/terms" className="hover:text-foreground transition-colors">Terms of Service</a></li>
                  <li><a href="https://bpr.clinic/cookies" className="hover:text-foreground transition-colors">Cookie Policy</a></li>
                  <li><a href="/shop?help=copyright" className="hover:text-foreground transition-colors">Copyright Notice</a></li>
                </ul>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="pt-6 border-t border-white/5">
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
                <p>© {new Date().getFullYear()} Bruno Physical Rehabilitation. All rights reserved.</p>
                <p className="text-center md:text-right">
                  Most products are BPR in-house 3D printed items. Some external products may link to Amazon and earn a commission at no extra cost to you.
                </p>
              </div>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
}
