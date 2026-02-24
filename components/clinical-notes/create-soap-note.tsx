"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ClipboardList,
  ArrowLeft,
  Loader2,
  CheckCircle,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

export default function CreateSOAPNote() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const appointmentId = searchParams?.get("appointmentId") ?? "";
  const patientId = searchParams?.get("patientId") ?? "";

  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [formData, setFormData] = useState({
    subjective: "",
    objective: "",
    assessment: "",
    plan: "",
    painLevel: "",
    rangeOfMotion: "",
    functionalTests: "",
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/soap-notes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          patientId,
          subjective: formData.subjective,
          objective: formData.objective,
          assessment: formData.assessment,
          plan: formData.plan,
          painLevel: formData.painLevel ? parseInt(formData.painLevel) : null,
          rangeOfMotion: formData.rangeOfMotion || null,
          functionalTests: formData.functionalTests || null,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || "Failed to create clinical note");
      }

      toast({
        title: "Clinical Note Created",
        description: "SOAP documentation has been saved successfully.",
      });

      router.push(`/dashboard/clinical-notes/${data?.soapNote?.id}`);
    } catch (error: any) {
      console.error("Error creating SOAP note:", error);
      toast({
        title: "Error",
        description: error?.message || "Failed to create clinical note.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!appointmentId || !patientId) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-amber-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 mb-2">
            Missing Information
          </h3>
          <p className="text-slate-500 mb-4">
            Please access this page from an appointment to create clinical notes.
          </p>
          <Link href="/dashboard/appointments">
            <Button>View Appointments</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/appointments/${appointmentId}`}>
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Create SOAP Note</h1>
          <p className="text-slate-600">Document the clinical session using UK standard SOAP format.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Subjective */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary">S - Subjective</CardTitle>
              <CardDescription>
                Document the patient&apos;s description of their condition, symptoms, and concerns.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="subjective">Patient&apos;s Description *</Label>
                <Textarea
                  id="subjective"
                  placeholder="Patient reports... Chief complaint, history of present illness, symptom description, aggravating/easing factors, functional impact..."
                  className="mt-1.5 min-h-[120px]"
                  value={formData.subjective}
                  onChange={(e) =>
                    setFormData({ ...formData, subjective: e.target.value })
                  }
                  required
                />
              </div>
              <div>
                <Label htmlFor="painLevel">Pain Level (0-10)</Label>
                <Input
                  id="painLevel"
                  type="number"
                  min="0"
                  max="10"
                  placeholder="Patient's reported pain level"
                  className="mt-1.5 w-32"
                  value={formData.painLevel}
                  onChange={(e) =>
                    setFormData({ ...formData, painLevel: e.target.value })
                  }
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Objective */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary">O - Objective</CardTitle>
              <CardDescription>
                Record clinical findings, measurements, and observations from examination.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="objective">Clinical Findings *</Label>
                <Textarea
                  id="objective"
                  placeholder="Observation, palpation findings, posture assessment, gait analysis, strength testing, special tests performed..."
                  className="mt-1.5 min-h-[120px]"
                  value={formData.objective}
                  onChange={(e) =>
                    setFormData({ ...formData, objective: e.target.value })
                  }
                  required
                />
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="rangeOfMotion">Range of Motion</Label>
                  <Input
                    id="rangeOfMotion"
                    placeholder="e.g., Flexion 90°, Extension 0°"
                    className="mt-1.5"
                    value={formData.rangeOfMotion}
                    onChange={(e) =>
                      setFormData({ ...formData, rangeOfMotion: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="functionalTests">Functional Tests</Label>
                  <Input
                    id="functionalTests"
                    placeholder="e.g., SLR +ve, FABER -ve"
                    className="mt-1.5"
                    value={formData.functionalTests}
                    onChange={(e) =>
                      setFormData({ ...formData, functionalTests: e.target.value })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Assessment */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary">A - Assessment</CardTitle>
              <CardDescription>
                Provide your clinical reasoning, working diagnosis, and prognosis.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="assessment">Clinical Assessment *</Label>
                <Textarea
                  id="assessment"
                  placeholder="Working diagnosis, clinical reasoning, differential diagnoses, prognosis, contributing factors..."
                  className="mt-1.5 min-h-[120px]"
                  value={formData.assessment}
                  onChange={(e) =>
                    setFormData({ ...formData, assessment: e.target.value })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Plan */}
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg text-primary">P - Plan</CardTitle>
              <CardDescription>
                Document the treatment plan, exercises, and follow-up recommendations.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="plan">Treatment Plan *</Label>
                <Textarea
                  id="plan"
                  placeholder="Treatment provided today, home exercise programme, self-management advice, goals, recommended frequency of treatment, referrals if needed..."
                  className="mt-1.5 min-h-[120px]"
                  value={formData.plan}
                  onChange={(e) =>
                    setFormData({ ...formData, plan: e.target.value })
                  }
                  required
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Submit */}
        <div className="flex gap-3">
          <Link href={`/dashboard/appointments/${appointmentId}`}>
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            className="flex-1 gap-2"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <CheckCircle className="h-4 w-4" />
                Save Clinical Note
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
