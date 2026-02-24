"use client";

import { useState, useEffect } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Shield, Mail, Lock, AlertCircle, Loader2, ArrowLeft, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";

export default function AdminLoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [darkLogoUrl, setDarkLogoUrl] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  useEffect(() => {
    setMounted(true);
    // Restore saved email if "remember me" was used
    try {
      const saved = localStorage.getItem("clinic-admin-remember");
      if (saved) {
        const { email } = JSON.parse(saved);
        if (email) {
          setFormData(prev => ({ ...prev, email }));
          setRememberMe(true);
        }
      }
    } catch {}
    // Fetch site settings for logo
    fetch("/api/settings")
      .then(res => res.json())
      .then(data => {
        const sl = data.screenLogos?.adminLogin;
        setLogoUrl(sl?.logoUrl || data.logoUrl || null);
        setDarkLogoUrl(sl?.darkLogoUrl || data.darkLogoUrl || null);
      })
      .catch(err => console.error("Failed to fetch settings:", err));
  }, []);

  const callbackUrl = searchParams?.get("callbackUrl") || "/admin";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const result = await signIn("credentials", {
        email: formData.email,
        password: formData.password,
        redirect: false,
      });

      if (result?.error) {
        setError(result.error === "CredentialsSignin" ? "Invalid email or password" : result.error);
      } else {
        // Check if user has admin/therapist role
        const res = await fetch("/api/auth/session");
        const session = await res.json();
        const userRole = session?.user?.role;
        
        if (userRole === "SUPERADMIN" || userRole === "ADMIN" || userRole === "THERAPIST") {
          // Save email if remember me is checked
          if (rememberMe) {
            localStorage.setItem("clinic-admin-remember", JSON.stringify({ email: formData.email }));
          } else {
            localStorage.removeItem("clinic-admin-remember");
          }
          router.replace(callbackUrl);
        } else {
          // Sign out if not admin/therapist
          await signIn("credentials", { redirect: false }); // This will fail and effectively log them out
          setError("Access denied. This login is for administrative staff only.");
          // Redirect to patient login
          router.replace("/login");
        }
      }
    } catch (err) {
      console.error("Login error:", err);
      setError("An unexpected error occurred. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-800 via-slate-700 to-slate-900 flex items-center justify-center p-4">
      <div>
        <div className="flex justify-center flex-col items-center mb-8">
          <Logo logoUrl={logoUrl} darkLogoUrl={darkLogoUrl} size="xl" linkTo="/" variant="dark" />
          <div className="mt-2">
            <span className="inline-flex items-center gap-2 text-white">
              <Shield className="h-5 w-5 text-bruno-turquoise" />
              <span className="text-sm font-semibold">Admin Portal</span>
            </span>
          </div>
        </div>

        <Card className="border-0 shadow-2xl bg-card/95 backdrop-blur">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Administrative Access</CardTitle>
            <CardDescription>
              Sign in to manage the clinic system
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="admin@clinic.com"
                    className="pl-10"
                    value={formData.email}
                    onChange={(e) =>
                      setFormData({ ...formData, email: e.target.value })
                    }
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-bruno-turquoise hover:underline hover:text-bruno-turquoise/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    className="pl-10 pr-10"
                    value={formData.password}
                    onChange={(e) =>
                      setFormData({ ...formData, password: e.target.value })
                    }
                    required
                  />
                  <button
                    type="button"
                    tabIndex={-1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 transition-colors"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="remember"
                  checked={rememberMe}
                  onCheckedChange={(checked) => setRememberMe(checked === true)}
                  className="border-slate-400 data-[state=checked]:bg-bruno-turquoise data-[state=checked]:border-bruno-turquoise"
                />
                <Label htmlFor="remember" className="text-sm font-normal text-slate-400 cursor-pointer">
                  Remember me
                </Label>
              </div>

              <Button
                type="submit"
                className="w-full bg-bruno-turquoise hover:bg-bruno-turquoise-dark"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  <>
                    <Shield className="h-4 w-4 mr-2" />
                    Sign In to Admin
                  </>
                )}
              </Button>
            </form>

            <div className="mt-6 pt-6 border-t border-border">
              <Link href="/" className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Back to Website
              </Link>
            </div>
          </CardContent>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          This area is restricted to authorised clinic staff only.
        </p>
      </div>
    </div>
  );
}
