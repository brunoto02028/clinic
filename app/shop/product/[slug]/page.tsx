"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ShoppingCart, ArrowLeft, Check, Star, Package, Truck, Shield,
  ChevronLeft, ChevronRight, Minus, Plus, X, Info
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export default function ProductPage() {
  const params = useParams();
  const router = useRouter();
  const { data: session } = useSession();
  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);

  useEffect(() => {
    if (!params.slug) return;
    
    fetch(`/api/patient/marketplace/products?slug=${params.slug}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && data.length > 0) {
          setProduct(data[0]);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [params.slug]);

  const addToCart = () => {
    const cart = JSON.parse(localStorage.getItem("bpr_cart") || "[]");
    const existing = cart.find((item: any) => item.productId === product.id);
    
    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.push({
        productId: product.id,
        name: product.name,
        price: product.price,
        imageUrl: product.imageUrl,
        quantity,
        isAffiliate: product.isAffiliate,
        affiliateUrl: product.affiliateUrl,
        amazonAsin: product.amazonAsin,
      });
    }
    
    localStorage.setItem("bpr_cart", JSON.stringify(cart));
    setAddedToCart(true);
    setTimeout(() => setAddedToCart(false), 3000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <Package className="h-12 w-12 text-muted-foreground/30 mx-auto animate-pulse" />
          <p className="text-muted-foreground">Loading product...</p>
        </div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Package className="h-16 w-16 text-muted-foreground/30 mx-auto" />
          <h1 className="text-2xl font-bold text-foreground">Product not found</h1>
          <Button onClick={() => router.push("/shop")} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" /> Back to Shop
          </Button>
        </div>
      </div>
    );
  }

  const images = product.images ? JSON.parse(product.images) : [];
  const allImages = [product.imageUrl, ...images].filter(Boolean);
  const tags = product.tags ? JSON.parse(product.tags) : [];

  const shippingCost = product.shippingCost || 0;
  const freeShippingOver = product.freeShippingOver || 50;
  const isFreeShipping = product.price * quantity >= freeShippingOver || shippingCost === 0;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-white/10 bg-background/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between">
          <button
            onClick={() => router.push("/shop")}
            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Back to Shop</span>
          </button>
          
          <Logo size="sm" />

          <Button
            size="sm"
            variant="outline"
            onClick={() => router.push("/shop")}
            className="gap-2"
          >
            <ShoppingCart className="h-4 w-4" />
            <span className="hidden sm:inline">View Cart</span>
          </Button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Left: Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square rounded-2xl overflow-hidden bg-muted border border-white/10">
              {product.featured && (
                <Badge className="absolute top-4 left-4 z-10 bg-amber-500 text-black">
                  Featured
                </Badge>
              )}
              {product.compareAtPrice && product.compareAtPrice > product.price && (
                <Badge className="absolute top-4 right-4 z-10 bg-red-500 text-white">
                  Save {Math.round(((product.compareAtPrice - product.price) / product.compareAtPrice) * 100)}%
                </Badge>
              )}
              
              <img
                src={allImages[selectedImage] || "/placeholder-product.png"}
                alt={product.name}
                className="w-full h-full object-contain p-8"
              />

              {allImages.length > 1 && (
                <>
                  <button
                    onClick={() => setSelectedImage((selectedImage - 1 + allImages.length) % allImages.length)}
                    className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    onClick={() => setSelectedImage((selectedImage + 1) % allImages.length)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-black/50 backdrop-blur-sm border border-white/20 flex items-center justify-center text-white hover:bg-black/70 transition-all"
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            {/* Thumbnail Gallery */}
            {allImages.length > 1 && (
              <div className="grid grid-cols-4 gap-3">
                {allImages.map((img, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedImage(idx)}
                    className={`aspect-square rounded-lg overflow-hidden border-2 transition-all ${
                      selectedImage === idx
                        ? "border-teal-500 ring-2 ring-teal-500/30"
                        : "border-white/10 hover:border-white/30"
                    }`}
                  >
                    <img src={img} alt="" className="w-full h-full object-contain p-2 bg-muted" />
                  </button>
                ))}
              </div>
            )}

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-3 pt-4">
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-white/5">
                <Shield className="h-5 w-5 text-teal-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Clinically designed</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-white/5">
                <Package className="h-5 w-5 text-teal-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">Made to order</p>
              </div>
              <div className="text-center p-3 rounded-lg bg-muted/30 border border-white/5">
                <Truck className="h-5 w-5 text-teal-400 mx-auto mb-1" />
                <p className="text-xs text-muted-foreground">UK shipping</p>
              </div>
            </div>
          </div>

          {/* Right: Product Details */}
          <div className="space-y-6">
            {/* Category Badge */}
            <div>
              <Badge variant="outline" className="mb-3">
                {product.category.replace(/_/g, " ").replace(/\b\w/g, (l: string) => l.toUpperCase())}
              </Badge>
            </div>

            {/* Title & Price */}
            <div>
              <h1 className="text-3xl sm:text-4xl font-black text-foreground leading-tight mb-3">
                {product.name}
              </h1>
              
              <div className="flex items-baseline gap-3">
                <span className="text-4xl font-black text-foreground">
                  £{product.price.toFixed(2)}
                </span>
                {product.compareAtPrice && product.compareAtPrice > product.price && (
                  <span className="text-xl text-muted-foreground line-through">
                    £{product.compareAtPrice.toFixed(2)}
                  </span>
                )}
              </div>

              {product.vatIncluded && (
                <p className="text-xs text-muted-foreground mt-1">
                  VAT included ({product.vatRate}%)
                </p>
              )}
            </div>

            {/* Short Description */}
            {product.shortDescription && (
              <p className="text-base text-muted-foreground leading-relaxed">
                {product.shortDescription}
              </p>
            )}

            {/* Quantity & Add to Cart */}
            <Card className="border-white/10 bg-muted/20">
              <CardContent className="p-4 space-y-4">
                <div className="flex items-center justify-between">
                  <label className="text-sm font-semibold text-foreground">Quantity</label>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="w-8 h-8 rounded-md bg-muted flex items-center justify-center hover:bg-muted/70 transition-all"
                    >
                      <Minus className="h-4 w-4" />
                    </button>
                    <span className="w-12 text-center font-bold text-foreground">{quantity}</span>
                    <button
                      onClick={() => setQuantity(quantity + 1)}
                      className="w-8 h-8 rounded-md bg-muted flex items-center justify-center hover:bg-muted/70 transition-all"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold text-foreground">£{(product.price * quantity).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Shipping</span>
                    <span className="font-semibold text-foreground">
                      {isFreeShipping ? (
                        <span className="text-teal-400">FREE</span>
                      ) : (
                        `£${shippingCost.toFixed(2)}`
                      )}
                    </span>
                  </div>
                  {!isFreeShipping && freeShippingOver > 0 && (
                    <p className="text-xs text-muted-foreground">
                      <Info className="h-3 w-3 inline mr-1" />
                      Free shipping on orders over £{freeShippingOver}
                    </p>
                  )}
                </div>

                <Button
                  onClick={addToCart}
                  className="w-full gap-2 bg-teal-500 hover:bg-teal-400 text-black font-bold py-6 rounded-xl shadow-lg shadow-teal-500/30"
                  disabled={product.isAffiliate}
                >
                  {addedToCart ? (
                    <>
                      <Check className="h-5 w-5" /> Added to Cart!
                    </>
                  ) : (
                    <>
                      <ShoppingCart className="h-5 w-5" /> Add to Cart — £{((product.price * quantity) + (isFreeShipping ? 0 : shippingCost)).toFixed(2)}
                    </>
                  )}
                </Button>

                {product.isAffiliate && (
                  <Button
                    onClick={() => window.open(product.affiliateUrl, "_blank")}
                    className="w-full gap-2 bg-orange-500 hover:bg-orange-400 text-white font-bold py-6 rounded-xl"
                  >
                    Buy on Amazon — £{product.price.toFixed(2)}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Product Details */}
            <div className="space-y-4">
              <h2 className="text-xl font-black text-foreground">Product Details</h2>
              
              <div className="prose prose-invert max-w-none">
                <div
                  className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap"
                  dangerouslySetInnerHTML={{ __html: product.description?.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/✓/g, '<span class="text-teal-400">✓</span>') || "" }}
                />
              </div>

              {/* Specifications */}
              {(product.sku || product.weight) && (
                <div className="mt-6 p-4 rounded-lg bg-muted/20 border border-white/10">
                  <h3 className="text-sm font-bold text-foreground mb-3">Specifications</h3>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {product.sku && (
                      <div>
                        <span className="text-muted-foreground">SKU:</span>
                        <span className="ml-2 font-semibold text-foreground">{product.sku}</span>
                      </div>
                    )}
                    {product.weight && (
                      <div>
                        <span className="text-muted-foreground">Weight:</span>
                        <span className="ml-2 font-semibold text-foreground">{(product.weight * 1000).toFixed(0)}g</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tags */}
              {tags.length > 0 && (
                <div className="flex flex-wrap gap-2 pt-2">
                  {tags.map((tag: string) => (
                    <Badge key={tag} variant="outline" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
