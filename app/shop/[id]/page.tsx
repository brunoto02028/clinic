"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  ShoppingCart, ExternalLink, ArrowLeft, Star, Package,
  Truck, Shield, Award, CheckCircle, Loader2, Plus, Minus,
  Zap, Video, Box, Crown, Heart, Sparkles,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const CATEGORY_CONFIG: Record<string, { label: string; emoji: string; color: string; bg: string }> = {
  supplement:       { label: "Supplements",       emoji: "💊", color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/20" },
  equipment:        { label: "Equipment",          emoji: "🏋️", color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/20" },
  digital_program:  { label: "Digital Program",   emoji: "📱", color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/20" },
  physical_product: { label: "Physical Product",  emoji: "📦", color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
  special_session:  { label: "Special Session",   emoji: "⚡", color: "text-amber-400",   bg: "bg-amber-500/10 border-amber-500/20" },
  subscription:     { label: "Subscription",      emoji: "👑", color: "text-violet-400",  bg: "bg-violet-500/10 border-violet-500/20" },
};

export default function ProductPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [qty, setQty] = useState(1);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    fetch("/api/shop/products")
      .then((r) => r.json())
      .then((d) => {
        const found = (d.products || []).find((p: any) => p.id === id);
        setProduct(found || null);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  const trackAndOpen = async () => {
    try {
      await fetch("/api/patient/marketplace/affiliate-click", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId: id }),
      });
    } catch {}
    const url = product?.affiliateUrl || (product?.amazonAsin ? `https://www.amazon.co.uk/dp/${product.amazonAsin}?tag=bprrrehab-21` : null);
    if (url) window.open(url, "_blank");
  };

  const addToCart = () => {
    if (!product) return;
    const cart = JSON.parse(localStorage.getItem("bpr_cart") || "[]");
    const existing = cart.find((i: any) => i.productId === product.id);
    if (existing) {
      existing.quantity += qty;
    } else {
      cart.push({ productId: product.id, name: product.name, price: product.price, imageUrl: product.imageUrl, quantity: qty });
    }
    localStorage.setItem("bpr_cart", JSON.stringify(cart));
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  if (loading) return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-teal-400" />
    </div>
  );

  if (!product) return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
      <Package className="h-16 w-16 text-muted-foreground/30" />
      <p className="text-lg font-semibold text-foreground">Product not found</p>
      <Button variant="outline" onClick={() => router.push("/shop")}><ArrowLeft className="h-4 w-4 mr-2" /> Back to Shop</Button>
    </div>
  );

  const config = CATEGORY_CONFIG[product.category];
  const hasDiscount = product.compareAtPrice && product.compareAtPrice > product.price;
  const discountPct = hasDiscount ? Math.round((1 - product.price / product.compareAtPrice) * 100) : 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center gap-3">
          <button onClick={() => router.push("/shop")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Back to Shop
          </button>
          <span className="text-muted-foreground/40">·</span>
          <span className="text-sm text-muted-foreground truncate max-w-xs">{product.name}</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid lg:grid-cols-2 gap-10 items-start">

          {/* Left — Image */}
          <div className="space-y-4">
            <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-muted/50 to-muted/20 aspect-square flex items-center justify-center">
              {product.featured && (
                <div className="absolute top-4 left-4 z-10 flex items-center gap-1 px-3 py-1 rounded-full bg-amber-400 text-black text-xs font-black">
                  <Star className="h-3 w-3" /> Featured
                </div>
              )}
              {hasDiscount && (
                <div className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full bg-red-500 text-white text-sm font-black">
                  -{discountPct}%
                </div>
              )}
              {product.imageUrl ? (
                <img src={product.imageUrl} alt={product.name}
                  className="w-full h-full object-contain p-8"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
              ) : (
                <Package className="h-24 w-24 text-muted-foreground/20" />
              )}
            </div>

            {/* Trust badges */}
            <div className="grid grid-cols-3 gap-3">
              {[
                { icon: Shield, text: "Clinically approved" },
                { icon: Award, text: "BPR selected" },
                { icon: Truck, text: "Amazon delivery" },
              ].map(({ icon: Icon, text }) => (
                <div key={text} className="flex flex-col items-center gap-1.5 p-3 rounded-2xl bg-muted/30 border border-white/5 text-center">
                  <Icon className="h-4 w-4 text-teal-400" />
                  <span className="text-[10px] text-muted-foreground leading-tight">{text}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Right — Details */}
          <div className="space-y-6">
            {/* Category + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={`text-xs font-semibold px-3 py-1 rounded-full border ${config?.bg || "bg-muted"} ${config?.color || "text-muted-foreground"}`}>
                {config?.emoji} {config?.label || product.category}
              </span>
              {product.isAffiliate && (
                <span className="text-xs px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 font-medium">
                  Fulfilled by Amazon
                </span>
              )}
            </div>

            {/* Name */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-foreground leading-tight">{product.name}</h1>
              {(product.shortDescription || product.description) && (
                <p className="mt-3 text-muted-foreground leading-relaxed">
                  {product.description || product.shortDescription}
                </p>
              )}
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-black text-foreground">£{Number(product.price).toFixed(2)}</span>
              {hasDiscount && (
                <>
                  <span className="text-lg text-muted-foreground line-through">£{Number(product.compareAtPrice).toFixed(2)}</span>
                  <span className="px-2 py-0.5 rounded-full bg-red-500/15 text-red-400 text-sm font-bold">Save {discountPct}%</span>
                </>
              )}
            </div>

            {/* Shipping info */}
            {!product.isAffiliate && !product.isDigital && (
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Truck className="h-4 w-4 text-teal-400" />
                {product.shippingCost > 0
                  ? <span>+ £{Number(product.shippingCost).toFixed(2)} shipping</span>
                  : <span className="text-emerald-400 font-medium">Free shipping</span>}
              </div>
            )}

            {/* Affiliate — Buy on Amazon */}
            {product.isAffiliate ? (
              <div className="space-y-3">
                <button
                  onClick={trackAndOpen}
                  className="w-full flex items-center justify-center gap-2.5 py-4 px-6 rounded-2xl bg-[#FF9900] hover:bg-[#e88a00] text-black text-base font-black transition-all hover:shadow-xl hover:shadow-amber-500/25 active:scale-[0.98]">
                  <ExternalLink className="h-5 w-5" />
                  Buy on Amazon — £{Number(product.price).toFixed(2)}
                </button>
                <p className="text-xs text-center text-muted-foreground">
                  Opens Amazon UK · Fulfilled and delivered by Amazon · BPR earns a small commission
                </p>
              </div>
            ) : (
              /* Own product — Add to cart */
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-muted/30">
                    <button onClick={() => setQty(Math.max(1, qty - 1))}
                      className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-10 text-center font-bold text-foreground">{qty}</span>
                    <button onClick={() => setQty(qty + 1)}
                      className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground transition-colors">
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  <button
                    onClick={addToCart}
                    className={`flex-1 flex items-center justify-center gap-2.5 py-3.5 px-6 rounded-2xl text-base font-black transition-all active:scale-[0.98] ${
                      added
                        ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
                        : "bg-teal-600 hover:bg-teal-500 text-white hover:shadow-xl hover:shadow-teal-500/25"
                    }`}>
                    {added ? <CheckCircle className="h-5 w-5" /> : <ShoppingCart className="h-5 w-5" />}
                    {added ? "Added to Cart!" : `Add to Cart — £${(product.price * qty).toFixed(2)}`}
                  </button>
                </div>
                <Button variant="outline" className="w-full gap-2 rounded-2xl h-12 text-sm"
                  onClick={() => router.push(`/shop?checkout=1`)}>
                  Buy Now
                </Button>
              </div>
            )}

            {/* Key features */}
            <div className="p-4 rounded-2xl bg-muted/20 border border-white/5 space-y-2">
              <p className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Why BPR recommends this</p>
              <div className="space-y-1.5">
                {[
                  "Hand-picked by BPR physiotherapy team",
                  "Evidence-based for rehabilitation & recovery",
                  product.isAffiliate ? "Fast delivery via Amazon Prime" : "Checked for quality and safety",
                ].map((f) => (
                  <div key={f} className="flex items-center gap-2 text-sm text-foreground">
                    <CheckCircle className="h-3.5 w-3.5 text-teal-400 shrink-0" />
                    <span>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
