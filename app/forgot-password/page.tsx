"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Loader2, ArrowLeft } from "lucide-react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { useLocale } from "@/hooks/use-locale";

export default function ForgotPasswordPage() {
    const { locale } = useLocale();
    const isPt = locale === "pt-BR";
    const [email, setEmail] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const response = await fetch("/api/auth/forgot-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email }),
            });

            if (response.ok) {
                setIsSubmitted(true);
                toast.success(isPt ? "Link de redefinição enviado, se a conta existir" : "Reset link sent if account exists");
            } else {
                const data = await response.json();
                toast.error(data.error || (isPt ? "Falha ao enviar link" : "Failed to send reset link"));
            }
        } catch (error) {
            toast.error(isPt ? "Ocorreu um erro. Tente novamente." : "An error occurred. Please try again.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <SiteHeader currentPage="other" />
            <main className="flex-1 flex items-center justify-center p-4 py-8">
            <Card className="w-full max-w-md">
                <CardHeader className="space-y-1">
                    <div className="flex items-center mb-2">
                        <Link href="/login" className="text-muted-foreground hover:text-primary transition-colors">
                            <ArrowLeft className="h-4 w-4" />
                        </Link>
                    </div>
                    <CardTitle className="text-2xl font-bold">{isPt ? "Esqueceu a Senha" : "Forgot Password"}</CardTitle>
                    <CardDescription>
                        {isPt ? "Digite seu e-mail e enviaremos um link para redefinir sua senha." : "Enter your email address and we'll send you a link to reset your password."}
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    {!isSubmitted ? (
                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="email">{isPt ? "E-mail" : "Email"}</Label>
                                <Input
                                    id="email"
                                    type="email"
                                    placeholder="name@example.com"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    required
                                />
                            </div>
                            <Button type="submit" className="w-full" disabled={isLoading}>
                                {isLoading ? (
                                    <>
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                        {isPt ? "Enviando..." : "Sending link..."}
                                    </>
                                ) : (
                                    isPt ? "Enviar Link" : "Send Reset Link"
                                )}
                            </Button>
                        </form>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-muted-foreground mb-6">
                                {isPt
                                    ? `Se existe uma conta para ${email}, você receberá um link de redefinição em breve.`
                                    : `If an account exists for ${email}, you will receive a password reset link shortly.`}
                            </p>
                            <Link href="/login">
                                <Button variant="outline" className="w-full">
                                    {isPt ? "Voltar ao Login" : "Back to Login"}
                                </Button>
                            </Link>
                        </div>
                    )}
                </CardContent>
            </Card>
            </main>
            <SiteFooter />
        </div>
    );
}
