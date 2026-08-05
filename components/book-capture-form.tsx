"use client";

import { useState } from "react";
import { BookOpen, Loader2, Mail, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

/**
 * Email capture for the "Beyond Pain" book — feeds the EmailContact list
 * with source="book" (see BPR_Devin_Spec_Beyond_Pain_Book.md §1-2). Never
 * unlocks the chapter directly: submitting only queues a double opt-in
 * confirmation email whose magic link unlocks Chapter One.
 */
export function BookCaptureForm({ compact = false }: { compact?: boolean }) {
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [consent, setConsent] = useState(false);
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "unlocked" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consent) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/beyond-pain/capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, firstName, consent }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      if (data.status === "unlocked") {
        window.location.href = "/beyond-pain/chapter-one";
        return;
      }
      setStatus("sent");
    } catch (err: any) {
      setStatus("error");
      setErrorMsg(err.message || "Something went wrong. Please try again.");
    }
  };

  if (status === "sent") {
    return (
      <div className="rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8 text-center">
        <CheckCircle2 className="h-10 w-10 text-primary mx-auto mb-3" />
        <h3 className="font-sora text-lg font-bold text-foreground mb-2">Almost there</h3>
        <p className="text-sm text-muted-foreground max-w-md mx-auto">
          Check your inbox and confirm your email to unlock Chapter One.
        </p>
      </div>
    );
  }

  return (
    <div className={compact ? "" : "rounded-2xl border border-primary/20 bg-primary/5 p-6 sm:p-8"}>
      <form onSubmit={handleSubmit} className="space-y-3">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input
            type="text"
            placeholder="First name (optional)"
            value={firstName}
            onChange={(e) => setFirstName(e.target.value)}
          />
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              type="email"
              required
              placeholder="Your email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-9"
            />
          </div>
        </div>

        <div className="flex items-start gap-2.5">
          <Checkbox id="book-consent" checked={consent} onCheckedChange={(c) => setConsent(c === true)} />
          <Label htmlFor="book-consent" className="font-normal cursor-pointer text-xs leading-relaxed text-muted-foreground">
            I agree to receive Chapter One and occasional emails about Beyond Pain, in line with the Privacy Policy. I can unsubscribe at any time.
          </Label>
        </div>

        {status === "error" && <p className="text-xs text-destructive">{errorMsg}</p>}

        <Button type="submit" disabled={!consent || status === "loading"} className="gap-2">
          {status === "loading" ? <Loader2 className="h-4 w-4 animate-spin" /> : <BookOpen className="h-4 w-4" />}
          Send me Chapter One
        </Button>
        <p className="text-xs text-muted-foreground/80 text-center">
          One writer, occasional emails, no spam. Unsubscribe with one click, anytime.
        </p>
      </form>

      <ul className="mt-5 space-y-2 text-sm text-muted-foreground">
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" />Chapter One, free — straight to your inbox.</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" />New chapters as they're written — follow the book from the very start.</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" />First to know at launch — you'll hear before anyone else.</li>
        <li className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-primary shrink-0" />No spam, ever — unsubscribe anytime.</li>
      </ul>
    </div>
  );
}
