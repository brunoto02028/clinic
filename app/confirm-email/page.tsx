"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, CheckCircle2, XCircle } from "lucide-react";

function ConfirmEmailContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<"loading" | "success" | "error">("loading");
  const [message, setMessage] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const requested = useRef(false);

  useEffect(() => {
    if (!token) {
      setStatus("error");
      setMessage("Invalid or missing confirmation token.");
      return;
    }
    if (requested.current) return;
    requested.current = true;

    fetch("/api/patient/change-email/confirm", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    })
      .then(async (res) => {
        const data = await res.json();
        if (res.ok) {
          setStatus("success");
          setNewEmail(data.newEmail || "");
        } else {
          setStatus("error");
          setMessage(data.error || "Failed to confirm email change.");
        }
      })
      .catch(() => {
        setStatus("error");
        setMessage("An error occurred. Please try again.");
      });
  }, [token]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Confirm Email Change</CardTitle>
          {status === "loading" && <CardDescription>Confirming your new email address...</CardDescription>}
        </CardHeader>
        <CardContent>
          {status === "loading" && (
            <div className="flex justify-center py-6">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}
          {status === "success" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <CheckCircle2 className="h-10 w-10 text-emerald-500" />
              <p className="text-sm text-muted-foreground">
                Your email has been updated to <strong>{newEmail}</strong>. Sign in with your new email from now on.
              </p>
              <Link href="/login" className="text-sm font-medium text-primary hover:underline">
                Go to sign in →
              </Link>
            </div>
          )}
          {status === "error" && (
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <XCircle className="h-10 w-10 text-destructive" />
              <p className="text-sm text-muted-foreground">{message}</p>
              <Link href="/dashboard/profile" className="text-sm font-medium text-primary hover:underline">
                Back to profile →
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export default function ConfirmEmailPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>}>
      <ConfirmEmailContent />
    </Suspense>
  );
}
