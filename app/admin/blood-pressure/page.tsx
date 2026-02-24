"use client";

import { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  HeartPulse,
  QrCode,
  Smartphone,
  Copy,
  ExternalLink,
  Loader2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Users,
  Activity,
  Search,
  ChevronDown,
  Phone,
  Mail,
  Shield,
  Pill,
  Stethoscope,
  FileText,
  User,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface Patient {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  createdAt?: string;
}

interface BPReading {
  id: string;
  systolic: number;
  diastolic: number;
  heartRate: number | null;
  method: string;
  notes: string | null;
  confidence: number | null;
  measuredAt: string;
}

interface PatientBP {
  patient: Patient;
  readings: BPReading[];
  stats: {
    count: number;
    avgSystolic: number;
    avgDiastolic: number;
    avgHeartRate: number | null;
    latest: {
      systolic: number;
      diastolic: number;
      heartRate: number | null;
      measuredAt: string;
    };
  } | null;
}

function classifyBP(sys: number, dia: number) {
  if (sys < 90 || dia < 60) return { label: "Low", color: "text-blue-600 bg-blue-50 border-blue-200", icon: TrendingDown };
  if (sys < 120 && dia < 80) return { label: "Normal", color: "text-emerald-600 bg-emerald-50 border-emerald-200", icon: CheckCircle };
  if (sys < 130 && dia < 80) return { label: "Elevated", color: "text-amber-600 bg-amber-50 border-amber-200", icon: TrendingUp };
  if (sys < 140 || dia < 90) return { label: "High (Stage 1)", color: "text-orange-600 bg-orange-50 border-orange-200", icon: AlertTriangle };
  return { label: "High (Stage 2)", color: "text-red-600 bg-red-50 border-red-200", icon: AlertTriangle };
}

export default function AdminBloodPressurePage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patientBPData, setPatientBPData] = useState<Map<string, PatientBP>>(new Map());
  const [patientProfiles, setPatientProfiles] = useState<Map<string, any>>(new Map());
  const [search, setSearch] = useState("");
  const [qrDialogOpen, setQrDialogOpen] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<Patient | null>(null);
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [loadingProfile, setLoadingProfile] = useState<string | null>(null);

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  const fetchPatients = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/patients");
      if (res.ok) {
        const data = await res.json();
        const pts = Array.isArray(data) ? data : data.patients || [];
        setPatients(pts);
      }
    } catch (error) {
      console.error("Error fetching patients:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchPatients();
  }, [fetchPatients]);

  const fetchPatientData = async (patientId: string) => {
    if (patientBPData.has(patientId) && patientProfiles.has(patientId)) return;
    setLoadingProfile(patientId);
    try {
      const [bpRes, profileRes] = await Promise.all([
        fetch(`/api/admin/patients/${patientId}/blood-pressure?days=90`),
        fetch(`/api/admin/patients/${patientId}`),
      ]);

      if (bpRes.ok) {
        const bpData = await bpRes.json();
        const patient = patients.find((p) => p.id === patientId);
        if (patient) {
          setPatientBPData((prev) => {
            const next = new Map(prev);
            next.set(patientId, { patient, readings: bpData.readings, stats: bpData.stats });
            return next;
          });
        }
      }

      if (profileRes.ok) {
        const profileData = await profileRes.json();
        setPatientProfiles((prev) => {
          const next = new Map(prev);
          next.set(patientId, profileData);
          return next;
        });
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
    } finally {
      setLoadingProfile(null);
    }
  };

  const handleExpandPatient = (patientId: string) => {
    if (expandedPatient === patientId) {
      setExpandedPatient(null);
    } else {
      setExpandedPatient(patientId);
      fetchPatientData(patientId);
    }
  };

  const openQrForPatient = (patient: Patient) => {
    setSelectedPatient(patient);
    setQrDialogOpen(true);
  };

  const qrUrl = selectedPatient
    ? `${baseUrl}/dashboard/blood-pressure`
    : "";

  const copyUrl = () => {
    navigator.clipboard.writeText(qrUrl);
    toast({ title: "Copied", description: "URL copied to clipboard" });
  };

  const filteredPatients = patients.filter((p) => {
    const q = search.toLowerCase();
    return (
      !q ||
      `${p.firstName} ${p.lastName}`.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q)
    );
  });

  // Count patients with BP data
  const patientsWithBP = Array.from(patientBPData.values()).filter((d) => d.stats);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
          <HeartPulse className="h-5 w-5 sm:h-6 sm:w-6 text-red-500" />
          {T("admin.bloodPressureTitle")}
        </h1>
        <p className="text-muted-foreground mt-1">
          View patient blood pressure readings and generate QR codes for mobile measurement.
        </p>
      </div>

      {/* Prominent QR Code Section */}
      <Card className="border-primary/30 bg-gradient-to-r from-red-50/50 to-primary/5">
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <div className="p-5 bg-white rounded-2xl border-2 border-primary/20 shadow-md flex-shrink-0">
              <QRCodeSVG
                value={`${baseUrl}/dashboard/blood-pressure`}
                size={180}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="text-xl font-bold flex items-center gap-2 justify-center md:justify-start">
                <Smartphone className="h-5 w-5 text-primary" />
                Scan to Measure Blood Pressure
              </h2>
              <p className="text-muted-foreground mt-2">
                Scan this QR code with a mobile phone to open the Blood Pressure measurement page.
                The patient can measure via <strong>camera PPG</strong> (photoplethysmography) or enter readings <strong>manually</strong>.
              </p>
              <div className="flex items-center gap-2 mt-3 justify-center md:justify-start">
                <Button
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  onClick={() => {
                    navigator.clipboard.writeText(`${baseUrl}/dashboard/blood-pressure`);
                    toast({ title: "Copied", description: "URL copied to clipboard" });
                  }}
                >
                  <Copy className="h-3.5 w-3.5" /> Copy Link
                </Button>
                <a href={`${baseUrl}/dashboard/blood-pressure`} target="_blank" rel="noopener noreferrer">
                  <Button variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> Open Page
                  </Button>
                </a>
              </div>
              <p className="text-xs text-muted-foreground mt-3 bg-amber-50 border border-amber-200 rounded-lg p-2 inline-block">
                <strong>Note:</strong> Camera PPG is for informational purposes only — not a medical device.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search patients by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Patient List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Patients
          </CardTitle>
          <CardDescription>{filteredPatients.length} patients found</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
            </div>
          ) : filteredPatients.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="font-medium">No patients found</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredPatients.map((patient) => {
                const bpData = patientBPData.get(patient.id);
                const isExpanded = expandedPatient === patient.id;

                return (
                  <div key={patient.id} className="border rounded-lg overflow-hidden">
                    {/* Patient row */}
                    <div className="flex items-center gap-3 p-3 hover:bg-muted/50 transition-colors">
                      <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                        <span className="text-xs font-semibold text-primary">
                          {patient.firstName?.[0]}{patient.lastName?.[0]}
                        </span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm">
                          {patient.firstName} {patient.lastName}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">{patient.email}</p>
                      </div>

                      {/* Quick stats if loaded */}
                      {bpData?.stats && (
                        <div className="hidden sm:flex items-center gap-2">
                          <Badge variant="outline" className={classifyBP(bpData.stats.latest.systolic, bpData.stats.latest.diastolic).color}>
                            {bpData.stats.latest.systolic}/{bpData.stats.latest.diastolic}
                          </Badge>
                          <span className="text-xs text-muted-foreground">{bpData.stats.count} readings</span>
                        </div>
                      )}

                      <div className="flex items-center gap-1">
                        <Button
                          variant="outline"
                          size="sm"
                          className="gap-1.5"
                          onClick={() => openQrForPatient(patient)}
                        >
                          <QrCode className="h-3.5 w-3.5" />
                          <span className="hidden sm:inline">QR Code</span>
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => handleExpandPatient(patient.id)}
                        >
                          <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded patient profile + readings */}
                    {isExpanded && (
                      <div className="border-t bg-muted/20 p-4">
                        {loadingProfile === patient.id ? (
                          <div className="flex justify-center py-6">
                            <Loader2 className="h-6 w-6 animate-spin text-primary" />
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {/* Patient Profile Card */}
                            {(() => {
                              const profile = patientProfiles.get(patient.id);
                              const screening = profile?.screening;
                              const bodyAssessments = profile?.bodyAssessments || [];
                              const latestBA = bodyAssessments[0];
                              const footScans = profile?.footScans || [];

                              return (
                                <>
                                  {/* Profile Info Row */}
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                    {/* Left: Patient Info */}
                                    <div className="bg-background rounded-lg border p-3 space-y-2">
                                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <User className="h-4 w-4 text-primary" />
                                        Patient Information
                                      </div>
                                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                                        <div>
                                          <span className="text-muted-foreground">Name:</span>
                                          <span className="ml-1 font-medium">{patient.firstName} {patient.lastName}</span>
                                        </div>
                                        <div>
                                          <span className="text-muted-foreground">Email:</span>
                                          <span className="ml-1 font-medium truncate">{patient.email}</span>
                                        </div>
                                        {patient.phone && (
                                          <div>
                                            <span className="text-muted-foreground">Phone:</span>
                                            <span className="ml-1 font-medium">{patient.phone}</span>
                                          </div>
                                        )}
                                        <div>
                                          <span className="text-muted-foreground">Registered:</span>
                                          <span className="ml-1 font-medium">
                                            {profile?.patient?.createdAt
                                              ? new Date(profile.patient.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
                                              : "—"}
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Right: Medical Screening */}
                                    <div className="bg-background rounded-lg border p-3 space-y-2">
                                      <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                                        <Shield className="h-4 w-4 text-primary" />
                                        Medical Screening
                                      </div>
                                      {screening ? (
                                        <div className="space-y-1.5 text-xs">
                                          {screening.currentMedications && (
                                            <div>
                                              <span className="text-muted-foreground flex items-center gap-1"><Pill className="h-3 w-3" /> Medications:</span>
                                              <p className="font-medium mt-0.5">{screening.currentMedications}</p>
                                            </div>
                                          )}
                                          {screening.allergies && (
                                            <div>
                                              <span className="text-muted-foreground">Allergies:</span>
                                              <span className="ml-1 font-medium">{screening.allergies}</span>
                                            </div>
                                          )}
                                          {screening.surgicalHistory && (
                                            <div>
                                              <span className="text-muted-foreground">Surgical History:</span>
                                              <span className="ml-1 font-medium">{screening.surgicalHistory}</span>
                                            </div>
                                          )}
                                          {screening.otherConditions && (
                                            <div>
                                              <span className="text-muted-foreground">Other Conditions:</span>
                                              <span className="ml-1 font-medium">{screening.otherConditions}</span>
                                            </div>
                                          )}
                                          {/* Red flags relevant to BP */}
                                          <div className="flex flex-wrap gap-1 mt-1">
                                            {screening.cardiovascularSymptoms && (
                                              <Badge variant="outline" className="text-[10px] text-red-600 bg-red-50 border-red-200">Cardiovascular Symptoms</Badge>
                                            )}
                                            {screening.dizzinessBalanceIssues && (
                                              <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 border-amber-200">Dizziness/Balance</Badge>
                                            )}
                                            {screening.severeHeadache && (
                                              <Badge variant="outline" className="text-[10px] text-amber-600 bg-amber-50 border-amber-200">Severe Headache</Badge>
                                            )}
                                          </div>
                                        </div>
                                      ) : (
                                        <p className="text-xs text-muted-foreground italic">No screening data available</p>
                                      )}
                                    </div>
                                  </div>

                                  {/* Assessment Scores Row */}
                                  {(latestBA || footScans.length > 0) && (
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                                      {latestBA?.postureScore != null && (
                                        <div className="bg-background rounded-lg border p-2 text-center">
                                          <p className="text-[10px] text-muted-foreground font-medium">Posture Score</p>
                                          <p className="text-xl font-bold text-primary">{latestBA.postureScore}<span className="text-xs font-normal">/100</span></p>
                                        </div>
                                      )}
                                      {latestBA?.symmetryScore != null && (
                                        <div className="bg-background rounded-lg border p-2 text-center">
                                          <p className="text-[10px] text-muted-foreground font-medium">Symmetry</p>
                                          <p className="text-xl font-bold text-primary">{latestBA.symmetryScore}<span className="text-xs font-normal">/100</span></p>
                                        </div>
                                      )}
                                      {latestBA?.mobilityScore != null && (
                                        <div className="bg-background rounded-lg border p-2 text-center">
                                          <p className="text-[10px] text-muted-foreground font-medium">Mobility</p>
                                          <p className="text-xl font-bold text-primary">{latestBA.mobilityScore}<span className="text-xs font-normal">/100</span></p>
                                        </div>
                                      )}
                                      <div className="bg-background rounded-lg border p-2 text-center">
                                        <p className="text-[10px] text-muted-foreground font-medium">Records</p>
                                        <p className="text-xs mt-1">
                                          <span className="font-semibold">{footScans.length}</span> scans ·{" "}
                                          <span className="font-semibold">{bodyAssessments.length}</span> assess.
                                        </p>
                                      </div>
                                    </div>
                                  )}
                                </>
                              );
                            })()}

                            {/* BP Stats + Readings */}
                            {!bpData ? (
                              <div className="flex justify-center py-4">
                                <Loader2 className="h-5 w-5 animate-spin text-primary" />
                              </div>
                            ) : bpData.readings.length === 0 ? (
                              <div className="text-center py-4 text-muted-foreground text-sm bg-background rounded-lg border p-4">
                                <HeartPulse className="h-8 w-8 mx-auto mb-2 opacity-30" />
                                <p>No blood pressure readings yet.</p>
                                <p className="text-xs mt-1">Use the QR code for this patient to start measuring.</p>
                              </div>
                            ) : (
                              <div className="space-y-3">
                                {bpData.stats && (
                                  <div className="grid grid-cols-4 gap-2">
                                    <div className="bg-background rounded-lg p-2 text-center border">
                                      <p className="text-[10px] text-muted-foreground font-medium">Latest BP</p>
                                      <p className="text-lg font-bold">{bpData.stats.latest.systolic}/{bpData.stats.latest.diastolic}</p>
                                      <Badge variant="outline" className={`text-[10px] ${classifyBP(bpData.stats.latest.systolic, bpData.stats.latest.diastolic).color}`}>
                                        {classifyBP(bpData.stats.latest.systolic, bpData.stats.latest.diastolic).label}
                                      </Badge>
                                    </div>
                                    <div className="bg-background rounded-lg p-2 text-center border">
                                      <p className="text-[10px] text-muted-foreground font-medium">Avg (90d)</p>
                                      <p className="text-lg font-bold">{bpData.stats.avgSystolic}/{bpData.stats.avgDiastolic}</p>
                                    </div>
                                    <div className="bg-background rounded-lg p-2 text-center border">
                                      <p className="text-[10px] text-muted-foreground font-medium">Heart Rate</p>
                                      <p className="text-lg font-bold">{bpData.stats.avgHeartRate || "—"}<span className="text-xs font-normal"> bpm</span></p>
                                    </div>
                                    <div className="bg-background rounded-lg p-2 text-center border">
                                      <p className="text-[10px] text-muted-foreground font-medium">Total Readings</p>
                                      <p className="text-lg font-bold">{bpData.stats.count}</p>
                                    </div>
                                  </div>
                                )}

                                <div className="space-y-1.5 max-h-48 overflow-y-auto">
                                  {bpData.readings.slice(0, 15).map((r) => {
                                    const cls = classifyBP(r.systolic, r.diastolic);
                                    const Icon = cls.icon;
                                    return (
                                      <div key={r.id} className={`flex items-center gap-3 p-2 rounded-lg border text-sm ${cls.color}`}>
                                        <Icon className="h-4 w-4 flex-shrink-0" />
                                        <span className="font-bold">{r.systolic}/{r.diastolic}</span>
                                        <span className="text-xs opacity-70">mmHg</span>
                                        {r.heartRate && <span className="text-xs opacity-70">· {r.heartRate} bpm</span>}
                                        <Badge variant="outline" className="text-[10px] ml-auto">
                                          {r.method === "CAMERA_PPG" ? "Camera" : "Manual"}
                                        </Badge>
                                        <span className="text-[10px] opacity-60">
                                          {new Date(r.measuredAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}
                                        </span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* BP Categories Reference */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Blood Pressure Categories (Reference)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
            {[
              { label: "Low", range: "<90/60", color: "bg-blue-50 text-blue-700 border-blue-200" },
              { label: "Normal", range: "<120/80", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
              { label: "Elevated", range: "120-129/<80", color: "bg-amber-50 text-amber-700 border-amber-200" },
              { label: "High (Stage 1)", range: "130-139/80-89", color: "bg-orange-50 text-orange-700 border-orange-200" },
              { label: "High (Stage 2)", range: "≥140/≥90", color: "bg-red-50 text-red-700 border-red-200" },
            ].map((cat) => (
              <div key={cat.label} className={`p-2 rounded border text-center ${cat.color}`}>
                <p className="font-semibold">{cat.label}</p>
                <p className="mt-0.5">{cat.range}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* QR Code Dialog */}
      <Dialog open={qrDialogOpen} onOpenChange={setQrDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5 text-primary" />
              Blood Pressure — QR Code
            </DialogTitle>
            <DialogDescription>
              {selectedPatient
                ? `Scan this QR code on ${selectedPatient.firstName} ${selectedPatient.lastName}'s phone to open the Blood Pressure measurement page.`
                : "Generate a QR code for mobile blood pressure measurement."}
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-4 bg-white rounded-xl border-2 border-primary/20 shadow-sm">
              <QRCodeSVG
                value={qrUrl}
                size={200}
                level="H"
                includeMargin
                bgColor="#ffffff"
                fgColor="#000000"
              />
            </div>

            <div className="text-center space-y-2 w-full">
              <p className="text-sm font-medium">
                {selectedPatient?.firstName} {selectedPatient?.lastName}
              </p>
              <div className="flex items-center gap-2 bg-muted rounded-lg p-2">
                <code className="text-xs flex-1 truncate text-muted-foreground">{qrUrl}</code>
                <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={copyUrl}>
                  <Copy className="h-3.5 w-3.5" />
                </Button>
                <a href={qrUrl} target="_blank" rel="noopener noreferrer">
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0">
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </a>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 w-full">
              <p className="text-xs text-amber-800">
                <strong>Instructions:</strong> The patient should scan this QR code with their phone camera.
                It will open the Blood Pressure page where they can measure using the camera PPG method
                or enter readings manually.
              </p>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
