"use client";

import { useState, useEffect } from "react";
import {
  Send, Loader2, CheckCircle, XCircle, Mail, User, TestTube,
  RefreshCw, ChevronDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
}

interface TestResult {
  action: string;
  success: boolean;
  message: string;
  to?: string;
  template?: string;
  time: string;
}

const TEMPLATES = [
  { slug: "WELCOME", label: "Welcome / Registration", icon: "👋" },
  { slug: "SCREENING_RECEIVED", label: "Screening Received", icon: "🛡️" },
  { slug: "APPOINTMENT_CONFIRMATION", label: "Appointment Confirmation", icon: "📅" },
  { slug: "APPOINTMENT_REMINDER", label: "Appointment Reminder", icon: "⏰" },
  { slug: "APPOINTMENT_CANCELLED", label: "Appointment Cancelled", icon: "❌" },
  { slug: "PAYMENT_CONFIRMATION", label: "Payment Confirmation", icon: "💳" },
  { slug: "TREATMENT_PROTOCOL", label: "Treatment Protocol", icon: "📋" },
  { slug: "ASSESSMENT_COMPLETED", label: "Assessment Completed", icon: "✅" },
  { slug: "DOCUMENT_RECEIVED", label: "Document Received", icon: "📄" },
  { slug: "MEMBERSHIP_ACTIVATED", label: "Membership Activated", icon: "👑" },
  { slug: "EXERCISE_REMINDER", label: "Exercise Reminder", icon: "🏋️" },
];

export default function EmailTestPage() {
  const { toast } = useToast();
  const [patients, setPatients] = useState<Patient[]>([]);
  const [selectedPatient, setSelectedPatient] = useState<string>("");
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<TestResult[]>([]);
  const [showPatients, setShowPatients] = useState(false);

  useEffect(() => {
    fetch("/api/admin/email-test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "list_patients" }),
    })
      .then((r) => r.json())
      .then((d) => { if (d.patients) setPatients(d.patients); })
      .catch(() => {});
  }, []);

  const runTest = async (action: string, templateSlug?: string) => {
    const label = templateSlug || action;
    setLoading(label);
    try {
      const res = await fetch("/api/admin/email-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          patientId: selectedPatient || undefined,
          templateSlug,
        }),
      });
      const data = await res.json();
      const result: TestResult = {
        action: label,
        success: data.success,
        message: data.message || data.error || "Unknown",
        to: data.to,
        template: data.template,
        time: new Date().toLocaleTimeString("en-GB"),
      };
      setResults((prev) => [result, ...prev]);
      toast({
        title: data.success ? "Email Sent" : "Failed",
        description: data.message || data.error,
        variant: data.success ? "default" : "destructive",
      });
    } catch (err) {
      toast({ title: "Error", description: "Request failed", variant: "destructive" });
    } finally {
      setLoading(null);
    }
  };

  const selectedP = patients.find((p) => p.id === selectedPatient);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
          <TestTube className="h-5 w-5 text-primary" />
          Email Test & Simulation
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Test the full email flow. Every email sent to a patient automatically sends a BCC copy to the admin (brunotoaz@gmail.com).
        </p>
      </div>

      {/* Patient Selector */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <User className="h-4 w-4" /> Select Patient (optional)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-2">
            Choose a real patient to send the test email TO them (you still get BCC). Leave empty to send to your own admin email.
          </p>
          <div className="relative">
            <button
              onClick={() => setShowPatients(!showPatients)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg border border-border text-sm text-left hover:border-primary/50 transition-colors"
            >
              <span>
                {selectedP
                  ? `${selectedP.firstName} ${selectedP.lastName} (${selectedP.email})`
                  : "No patient selected — emails go to admin"}
              </span>
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </button>
            {showPatients && (
              <div className="absolute z-10 mt-1 w-full bg-background border border-border rounded-lg shadow-lg max-h-60 overflow-auto">
                <button
                  onClick={() => { setSelectedPatient(""); setShowPatients(false); }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-muted border-b border-border"
                >
                  None — send to admin
                </button>
                {patients.map((p) => (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p.id); setShowPatients(false); }}
                    className={`w-full px-3 py-2 text-sm text-left hover:bg-muted ${selectedPatient === p.id ? "bg-primary/10" : ""}`}
                  >
                    {p.firstName} {p.lastName} — {p.email}
                  </button>
                ))}
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Tests */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Quick Tests</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid sm:grid-cols-3 gap-2">
            <Button
              variant="outline"
              onClick={() => runTest("test_smtp")}
              disabled={loading !== null}
              className="h-auto py-3 flex-col gap-1"
            >
              {loading === "test_smtp" ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
              <span className="text-xs">Test SMTP</span>
              <span className="text-[10px] text-muted-foreground">Verify connection</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => runTest("simulate_signup")}
              disabled={loading !== null}
              className="h-auto py-3 flex-col gap-1"
            >
              {loading === "simulate_signup" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>👋</span>}
              <span className="text-xs">Simulate Signup</span>
              <span className="text-[10px] text-muted-foreground">Welcome email</span>
            </Button>
            <Button
              variant="outline"
              onClick={() => runTest("simulate_screening")}
              disabled={loading !== null}
              className="h-auto py-3 flex-col gap-1"
            >
              {loading === "simulate_screening" ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>🛡️</span>}
              <span className="text-xs">Simulate Screening</span>
              <span className="text-[10px] text-muted-foreground">Screening received</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* All Templates */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Send Any Template</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid sm:grid-cols-2 gap-2">
            {TEMPLATES.map((t) => (
              <button
                key={t.slug}
                onClick={() => runTest("simulate_template", t.slug)}
                disabled={loading !== null}
                className="flex items-center gap-3 p-3 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 transition-colors text-left disabled:opacity-50"
              >
                <span className="text-lg">{t.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate">{t.label}</p>
                  <p className="text-[10px] text-muted-foreground font-mono">{t.slug}</p>
                </div>
                {loading === t.slug ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin text-primary shrink-0" />
                ) : (
                  <Send className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                )}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Results Log */}
      {results.length > 0 && (
        <Card>
          <CardHeader className="pb-3 flex-row items-center justify-between">
            <CardTitle className="text-sm">Results Log ({results.length})</CardTitle>
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setResults([])}>
              Clear
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {results.map((r, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 p-2 rounded-lg border text-xs ${
                  r.success ? "border-emerald-500/20 bg-emerald-500/5" : "border-red-500/20 bg-red-500/5"
                }`}
              >
                {r.success ? (
                  <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <XCircle className="h-4 w-4 text-red-500 shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="font-medium">{r.message}</p>
                  <p className="text-muted-foreground mt-0.5">
                    {r.template && <span className="font-mono">{r.template}</span>}
                    {r.to && <span> → {r.to}</span>}
                    <span className="ml-2">{r.time}</span>
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
