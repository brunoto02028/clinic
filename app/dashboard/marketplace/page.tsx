"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ShoppingCart, Star, Trophy, Package, Zap, Video,
  Loader2, Sparkles, Crown, Globe, Box, Plus, Minus,
  X, CreditCard, ExternalLink, Truck, CheckCircle, RefreshCw,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { useLocale } from "@/hooks/use-locale";

interface Product {
  id: string;
  name: string;
  description: string | null;
  shortDescription: string | null;
  category: string;
  price: number;
  currency: string;
  imageUrl: string | null;
  compareAtPrice: number | null;
  creditsCost: number;
  creditsDiscount: number;
  targetMinLevel: number | null;
  isAffiliate: boolean;
  affiliateUrl: string | null;
  isDigital: boolean;
  shippingCost: number;
  featured: boolean;
}

interface CartItem {
  product: Product;
  quantity: number;
}

const CATEGORY_CONFIG: Record<string, { labelEn: string; labelPt: string; icon: any; color: string }> = {
  digital_program: { labelEn: "Digital Programs", labelPt: "Programas Digitais", icon: Video, color: "bg-blue-100 text-blue-700" },
  physical_product: { labelEn: "Physical Products", labelPt: "Produtos Físicos", icon: Package, color: "bg-emerald-100 text-emerald-700" },
  equipment: { labelEn: "Equipment", labelPt: "Equipamentos", icon: Box, color: "bg-cyan-100 text-cyan-700" },
  supplement: { labelEn: "Supplements", labelPt: "Suplementos", icon: Plus, color: "bg-pink-100 text-pink-700" },
  special_session: { labelEn: "Special Sessions", labelPt: "Sessões Especiais", icon: Zap, color: "bg-amber-100 text-amber-700" },
  subscription: { labelEn: "Subscriptions", labelPt: "Assinaturas", icon: Crown, color: "bg-violet-100 text-violet-700" },
};

export default function MarketplacePage() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [products, setProducts] = useState<Product[]>([]);
  const [recommended, setRecommended] = useState<Product[]>([]);
  const [credits, setCredits] = useState(0);
  const [level, setLevel] = useState(1);
  const [levelTitle, setLevelTitle] = useState("Recovery Starter");
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState("all");

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);
  const [showCart, setShowCart] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState<any>(null);
  const [useCredits, setUseCredits] = useState(0);

  // Shipping form
  const [shippingForm, setShippingForm] = useState({
    name: "", address: "", city: "", postcode: "", country: "UK", phone: "", notes: "",
  });

  useEffect(() => {
    fetch("/api/patient/journey/marketplace")
      .then((r) => r.json())
      .then((d) => {
        setProducts(d.products || []);
        setRecommended(d.categories?.recommended || []);
        setCredits(d.credits || 0);
        setLevel(d.level || 1);
        setLevelTitle(d.levelTitle || "Recovery Starter");
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  // Check URL params for order success
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("success") === "true") {
      setOrderSuccess({ message: isPt ? "Pagamento realizado com sucesso! Seu pedido está sendo processado." : "Payment successful! Your order is being processed." });
    }
  }, []);

  const addToCart = (product: Product) => {
    if (product.isAffiliate) {
      // Affiliate products open in new tab
      if (product.affiliateUrl) window.open(product.affiliateUrl, "_blank");
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, { product, quantity: 1 }];
    });
    setShowCart(true);
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => prev.map((i) => {
      if (i.product.id !== productId) return i;
      const qty = Math.max(1, i.quantity + delta);
      return { ...i, quantity: qty };
    }));
  };

  const cartSubtotal = cart.reduce((s, i) => s + i.product.price * i.quantity, 0);
  const cartShipping = cart.reduce((s, i) => s + (i.product.isDigital ? 0 : (i.product.shippingCost || 0) * i.quantity), 0);
  const creditsValue = useCredits * 0.01;
  const levelDiscount = level >= 5 ? Math.min(25, Math.floor(level / 5) * 5) : 0;
  const discountAmount = cartSubtotal * levelDiscount / 100;
  const cartTotal = Math.max(0, cartSubtotal + cartShipping - discountAmount - creditsValue);
  const needsShipping = cart.some((i) => !i.product.isDigital);

  const checkout = async () => {
    setCheckingOut(true);
    try {
      const res = await fetch("/api/patient/marketplace/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((i) => ({ productId: i.product.id, quantity: i.quantity })),
          shippingInfo: needsShipping ? shippingForm : undefined,
          useCredits: useCredits > 0 ? useCredits : undefined,
        }),
      });
      const data = await res.json();

      if (data.stripeUrl) {
        window.location.href = data.stripeUrl;
        return;
      }

      if (data.order) {
        setOrderSuccess(data);
        setCart([]);
        setShowCart(false);
      }
    } catch {}
    setCheckingOut(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const filtered = activeCategory === "all"
    ? products
    : activeCategory === "recommended"
      ? recommended
      : products.filter((p) => p.category === activeCategory);

  const categories = ["all", "recommended", ...Object.keys(CATEGORY_CONFIG)];

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Order Success Banner */}
      {orderSuccess && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 flex items-center gap-3">
              <CheckCircle className="h-5 w-5 text-emerald-500 shrink-0" />
              <div className="flex-1">
                <p className="text-sm font-medium text-emerald-800">
                  {orderSuccess.message || (isPt ? "Pedido realizado com sucesso!" : "Order placed successfully!")}
                </p>
                {orderSuccess.order && (
                  <p className="text-xs text-emerald-600 mt-0.5">{isPt ? "Pedido" : "Order"} #{orderSuccess.order.orderNumber}</p>
                )}
              </div>
              <Button variant="ghost" size="sm" onClick={() => setOrderSuccess(null)}><X className="h-4 w-4" /></Button>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Header with credits + cart */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center gap-2">
            <ShoppingCart className="h-6 w-6 text-primary" /> Marketplace
          </h1>
          <p className="text-sm text-slate-500 mt-1">{isPt ? "Produtos e programas personalizados para a sua recuperação" : "Personalised products and programs for your recovery"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <Star className="h-4 w-4 text-emerald-500" />
            <span className="text-sm font-bold text-emerald-700">{credits} {isPt ? "Créditos" : "Credits"}</span>
          </div>
          <div className="bg-violet-50 border border-violet-200 rounded-lg px-3 py-2 flex items-center gap-2">
            <Trophy className="h-4 w-4 text-violet-500" />
            <span className="text-xs font-medium text-violet-700">Lvl {level}</span>
          </div>
          <Button
            variant={showCart ? "default" : "outline"}
            size="sm"
            className="gap-1 relative"
            onClick={() => setShowCart(!showCart)}
          >
            <ShoppingCart className="h-4 w-4" />
            {cart.length > 0 && (
              <span className="absolute -top-1.5 -right-1.5 bg-red-500 text-white text-[10px] rounded-full w-4 h-4 flex items-center justify-center">
                {cart.reduce((s, i) => s + i.quantity, 0)}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* Level discount banner */}
      {level >= 5 && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-white">
            <CardContent className="p-3 flex items-center gap-3">
              <Sparkles className="h-5 w-5 text-amber-500 shrink-0" />
              <p className="text-sm text-amber-800">
                <span className="font-bold">{isPt ? `Benefício Nível ${level}` : `Level ${level} Benefit`}:</span> {isPt ? "Você tem" : "You have"}{" "}
                <span className="font-bold">{levelDiscount}% {isPt ? "de desconto" : "discount"}</span> {isPt ? "em todos os produtos!" : "on all products!"}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Cart Drawer */}
      <AnimatePresence>
        {showCart && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
            <Card className="border-primary/30 shadow-lg">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="font-bold text-slate-800 flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4" /> {isPt ? "Seu Carrinho" : "Your Cart"} ({cart.length})
                  </h2>
                  <Button variant="ghost" size="sm" onClick={() => setShowCart(false)}><X className="h-4 w-4" /></Button>
                </div>

                {cart.length === 0 ? (
                  <p className="text-sm text-slate-400 text-center py-4">{isPt ? "Seu carrinho está vazio" : "Your cart is empty"}</p>
                ) : (
                  <>
                    {/* Cart Items */}
                    <div className="space-y-2">
                      {cart.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3 bg-slate-50 rounded-lg p-2">
                          {item.product.imageUrl ? (
                            <img src={item.product.imageUrl} alt="" className="w-12 h-12 rounded object-cover" />
                          ) : (
                            <div className="w-12 h-12 rounded bg-slate-200 flex items-center justify-center">
                              <Package className="h-5 w-5 text-slate-400" />
                            </div>
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.product.name}</p>
                            <p className="text-xs text-slate-500">£{item.product.price.toFixed(2)} {isPt ? "cada" : "each"}</p>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.product.id, -1)}>
                              <Minus className="h-3 w-3" />
                            </Button>
                            <span className="text-sm font-medium w-6 text-center">{item.quantity}</span>
                            <Button variant="outline" size="sm" className="h-7 w-7 p-0" onClick={() => updateQuantity(item.product.id, 1)}>
                              <Plus className="h-3 w-3" />
                            </Button>
                          </div>
                          <span className="text-sm font-bold w-16 text-right">£{(item.product.price * item.quantity).toFixed(2)}</span>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400" onClick={() => removeFromCart(item.product.id)}>
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    {/* Shipping Form */}
                    {needsShipping && (
                      <div className="border-t pt-3">
                        <h3 className="text-xs font-bold text-slate-600 flex items-center gap-1 mb-2">
                          <Truck className="h-3.5 w-3.5" /> {isPt ? "Endereço de Entrega" : "Shipping Address"}
                        </h3>
                        <div className="grid gap-2 sm:grid-cols-2">
                          <Input placeholder={isPt ? "Nome Completo" : "Full Name"} value={shippingForm.name} onChange={(e) => setShippingForm({ ...shippingForm, name: e.target.value })} className="text-xs h-8" />
                          <Input placeholder={isPt ? "Telefone" : "Phone"} value={shippingForm.phone} onChange={(e) => setShippingForm({ ...shippingForm, phone: e.target.value })} className="text-xs h-8" />
                          <Input placeholder={isPt ? "Endereço" : "Address"} value={shippingForm.address} onChange={(e) => setShippingForm({ ...shippingForm, address: e.target.value })} className="text-xs h-8 sm:col-span-2" />
                          <Input placeholder={isPt ? "Cidade" : "City"} value={shippingForm.city} onChange={(e) => setShippingForm({ ...shippingForm, city: e.target.value })} className="text-xs h-8" />
                          <Input placeholder="Postcode" value={shippingForm.postcode} onChange={(e) => setShippingForm({ ...shippingForm, postcode: e.target.value })} className="text-xs h-8" />
                        </div>
                      </div>
                    )}

                    {/* Credits */}
                    {credits > 0 && (
                      <div className="border-t pt-3">
                        <label className="text-xs font-medium text-slate-600 flex items-center gap-1 mb-1">
                          <Star className="h-3 w-3 text-emerald-500" /> {isPt ? `Usar Créditos BPR (Disponível: ${credits})` : `Use BPR Credits (Available: ${credits})`}
                        </label>
                        <Input
                          type="number"
                          min="0"
                          max={credits}
                          value={useCredits || ""}
                          onChange={(e) => setUseCredits(Math.min(credits, parseInt(e.target.value) || 0))}
                          className="text-xs h-8 w-32"
                          placeholder="0"
                        />
                        {useCredits > 0 && <p className="text-[10px] text-emerald-600 mt-0.5">{isPt ? "Desconto" : "Discount"}: -£{creditsValue.toFixed(2)}</p>}
                      </div>
                    )}

                    {/* Totals */}
                    <div className="border-t pt-3 space-y-1 text-sm">
                      <div className="flex justify-between text-slate-500"><span>Subtotal</span><span>£{cartSubtotal.toFixed(2)}</span></div>
                      {cartShipping > 0 && <div className="flex justify-between text-slate-500"><span>{isPt ? "Frete" : "Shipping"}</span><span>£{cartShipping.toFixed(2)}</span></div>}
                      {discountAmount > 0 && <div className="flex justify-between text-amber-600"><span>{isPt ? `Desconto Nível ${level}` : `Level ${level} Discount`} (-{levelDiscount}%)</span><span>-£{discountAmount.toFixed(2)}</span></div>}
                      {creditsValue > 0 && <div className="flex justify-between text-emerald-600"><span>{isPt ? "Créditos" : "Credits"} ({useCredits})</span><span>-£{creditsValue.toFixed(2)}</span></div>}
                      <div className="flex justify-between font-bold text-base border-t pt-1"><span>Total</span><span>£{cartTotal.toFixed(2)}</span></div>
                    </div>

                    {/* Checkout */}
                    <Button
                      onClick={checkout}
                      disabled={checkingOut || (needsShipping && (!shippingForm.name || !shippingForm.address || !shippingForm.postcode))}
                      className="w-full gap-2"
                    >
                      {checkingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}
                      {cartTotal > 0 ? (isPt ? `Pagar £${cartTotal.toFixed(2)}` : `Pay £${cartTotal.toFixed(2)}`) : (isPt ? "Finalizar Pedido (Grátis)" : "Complete Order (Free)")}
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {categories.map((cat) => {
          const isActive = activeCategory === cat;
          const config = CATEGORY_CONFIG[cat];
          const label = cat === "all" ? (isPt ? "Todos" : "All") : cat === "recommended" ? (isPt ? "Para Você" : "For You") : (isPt ? config?.labelPt : config?.labelEn) || cat;
          return (
            <button
              key={cat}
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${
                isActive ? "bg-primary text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
              }`}
            >
              {cat === "recommended" && "⭐ "}{label}
            </button>
          );
        })}
      </div>

      {/* Products Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-12">
          <Package className="h-10 w-10 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">{isPt ? "Nenhum produto disponível nesta categoria ainda" : "No products available in this category yet"}</p>
          <p className="text-xs text-slate-400 mt-1">{isPt ? "Volte em breve — novos itens são adicionados regularmente" : "Check back soon — new items are added regularly"}</p>
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((product: any, i: number) => {
            const config = CATEGORY_CONFIG[product.category];
            const CatIcon = config?.icon || Package;
            const discountedPrice = product.price * (1 - levelDiscount / 100);
            const inCart = cart.find((c) => c.product.id === product.id);

            return (
              <motion.div
                key={product.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
              >
                <Card className="card-hover h-full flex flex-col overflow-hidden relative">
                  {product.featured && (
                    <div className="absolute top-2 right-2 z-10">
                      <Badge className="bg-amber-400 text-white text-[10px]">{isPt ? "Destaque" : "Featured"}</Badge>
                    </div>
                  )}

                  {/* Image */}
                  {product.imageUrl ? (
                    <div className="h-36 bg-slate-100 overflow-hidden">
                      <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover" />
                    </div>
                  ) : (
                    <div className="h-36 bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                      <CatIcon className="h-12 w-12 text-slate-300" />
                    </div>
                  )}

                  <CardContent className="p-4 flex-1 flex flex-col">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <Badge variant="outline" className={`text-[10px] ${config?.color || ""}`}>
                        {isPt ? (config?.labelPt || product.category) : (config?.labelEn || product.category)}
                      </Badge>
                      {recommended.some((r: any) => r.id === product.id) && (
                        <Badge className="bg-amber-100 text-amber-700 text-[10px]">⭐ {isPt ? "Para Você" : "For You"}</Badge>
                      )}
                    </div>

                    <h3 className="font-bold text-slate-800 text-sm mb-1">{product.name}</h3>
                    {(product.shortDescription || product.description) && (
                      <p className="text-xs text-slate-500 mb-3 line-clamp-2 flex-1">
                        {product.shortDescription || product.description}
                      </p>
                    )}

                    <div className="mt-auto space-y-2">
                      {/* Price */}
                      <div className="flex items-baseline gap-2">
                        {levelDiscount > 0 && !product.isAffiliate ? (
                          <>
                            <span className="text-lg font-bold text-primary">£{discountedPrice.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 line-through">£{product.price.toFixed(2)}</span>
                            <Badge className="bg-red-100 text-red-700 text-[10px]">-{levelDiscount}%</Badge>
                          </>
                        ) : product.compareAtPrice ? (
                          <>
                            <span className="text-lg font-bold text-primary">£{product.price.toFixed(2)}</span>
                            <span className="text-xs text-slate-400 line-through">£{product.compareAtPrice.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="text-lg font-bold text-primary">£{product.price.toFixed(2)}</span>
                        )}
                      </div>

                      {/* Shipping info */}
                      {!product.isDigital && !product.isAffiliate && product.shippingCost > 0 && (
                        <p className="text-[10px] text-slate-400 flex items-center gap-1">
                          <Truck className="h-2.5 w-2.5" /> +£{product.shippingCost.toFixed(2)} {isPt ? "frete" : "shipping"}
                        </p>
                      )}

                      {/* Credits option */}
                      {product.creditsCost > 0 && (
                        <p className="text-[10px] text-emerald-600">
                          {isPt ? `Ou use ${product.creditsCost} Créditos BPR` : `Or use ${product.creditsCost} BPR Credits`}
                        </p>
                      )}

                      {product.isAffiliate ? (
                        <div className="space-y-1">
                          <Button size="sm" className="w-full gap-1 text-xs" onClick={() => addToCart(product)}>
                            <ShoppingCart className="h-3 w-3" /> {isPt ? "Comprar Produto" : "Buy Product"}
                          </Button>
                          <p className="text-[9px] text-slate-400 text-center flex items-center justify-center gap-0.5">
                            <Truck className="h-2.5 w-2.5" /> {isPt ? "Entrega via Amazon" : "Delivery via Amazon"}
                          </p>
                        </div>
                      ) : inCart ? (
                        <Button size="sm" variant="outline" className="w-full gap-1 text-xs text-emerald-600 border-emerald-200" onClick={() => setShowCart(true)}>
                          <CheckCircle className="h-3 w-3" /> {isPt ? "No Carrinho" : "In Cart"} ({inCart.quantity})
                        </Button>
                      ) : (
                        <Button size="sm" className="w-full gap-1 text-xs" onClick={() => addToCart(product)}>
                          <ShoppingCart className="h-3 w-3" /> {isPt ? "Adicionar ao Carrinho" : "Add to Cart"}
                        </Button>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Credits Info */}
      <Card className="bg-slate-50 border-slate-200">
        <CardContent className="p-4 text-center">
          <p className="text-xs text-slate-500">
            <span className="font-semibold">{isPt ? "Créditos BPR" : "BPR Credits"}:</span> {isPt ? "Ganhe créditos completando exercícios, missões e sequências. 1 crédito = £0.01 de desconto." : "Earn credits by completing exercises, missions and streaks. 1 credit = £0.01 discount."} {isPt ? "Você tem" : "You have"} <span className="font-bold text-emerald-600">{credits} {isPt ? "créditos" : "credits"}</span> (£{(credits * 0.01).toFixed(2)} {isPt ? "de valor" : "value"}).
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
