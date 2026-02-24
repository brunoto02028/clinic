"use client";

import { useState, useEffect } from "react";
import { useSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Calendar,
  Clock,
  User,
  CreditCard,
  FileText,
  ArrowLeft,
  Loader2,
  CheckCircle,
  XCircle,
  AlertCircle,
  Edit,
  Shield,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

interface AppointmentDetailProps {
  appointmentId: string;
}

interface Appointment {
  id: string;
  dateTime: string;
  duration: number;
  treatmentType: string;
  status: string;
  notes: string | null;
  price: number;
  patient: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    phone: string | null;
  };
  therapist: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  payment: {
    id: string;
    status: string;
    amount: number;
    stripeSessionId: string | null;
  } | null;
  soapNote: {
    id: string;
  } | null;
}

export default function AppointmentDetail({ appointmentId }: AppointmentDetailProps) {
  const { data: session } = useSession() || {};
  const router = useRouter();
  const searchParams = useSearchParams();
  const { toast } = useToast();

  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [cancelDialogOpen, setCancelDialogOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelSubmitting, setCancelSubmitting] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ success?: boolean; refundEligible?: boolean; refundAmount?: number; isWithin48h?: boolean; policyMessage?: string; error?: string } | null>(null);
  const [editForm, setEditForm] = useState({
    dateTime: "",
    duration: 60,
    treatmentType: "",
    price: 0,
    notes: "",
  });

  const isTherapist =
    (session?.user as any)?.role === "ADMIN" ||
    (session?.user as any)?.role === "THERAPIST";

  useEffect(() => {
    setMounted(true);
    fetchAppointment();
  }, [appointmentId]);

  useEffect(() => {
    // Handle payment callback
    const paymentStatus = searchParams?.get("payment");
    if (paymentStatus === "success" && appointment?.payment?.stripeSessionId) {
      verifyPayment(appointment.payment.stripeSessionId);
    }
  }, [searchParams, appointment?.payment?.stripeSessionId]);

  const fetchAppointment = async () => {
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`);
      const data = await response.json();
      setAppointment(data?.appointment ?? null);
    } catch (error) {
      console.error("Error fetching appointment:", error);
    } finally {
      setLoading(false);
    }
  };

  const verifyPayment = async (sessionId: string) => {
    try {
      const response = await fetch("/api/payments/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId }),
      });

      const data = await response.json();

      if (data?.success) {
        toast({
          title: "Payment Successful",
          description: "Your appointment has been confirmed.",
          variant: "success" as any,
        });
        fetchAppointment();
      }
    } catch (error) {
      console.error("Error verifying payment:", error);
    }
  };

  const handleUpdateStatus = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });

      if (response.ok) {
        toast({
          title: "Status Updated",
          description: `Appointment status changed to ${newStatus.toLowerCase()}.`,
        });
        fetchAppointment();
      }
    } catch (error) {
      console.error("Error updating status:", error);
    } finally {
      setUpdating(false);
    }
  };

  const handleProceedToPayment = async () => {
    setUpdating(true);
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ appointmentId }),
      });

      const data = await response.json();

      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Error creating payment session:", error);
    } finally {
      setUpdating(false);
    }
  };

  const openEditDialog = () => {
    if (appointment) {
      const appointmentDate = new Date(appointment.dateTime);
      const formattedDateTime = `${appointmentDate.getFullYear()}-${String(
        appointmentDate.getMonth() + 1
      ).padStart(2, "0")}-${String(appointmentDate.getDate()).padStart(2, "0")}T${String(
        appointmentDate.getHours()
      ).padStart(2, "0")}:${String(appointmentDate.getMinutes()).padStart(2, "0")}`;

      setEditForm({
        dateTime: formattedDateTime,
        duration: appointment.duration,
        treatmentType: appointment.treatmentType,
        price: appointment.price,
        notes: appointment.notes || "",
      });
      setEditDialogOpen(true);
    }
  };

  const handleEditAppointment = async () => {
    setUpdating(true);
    try {
      const response = await fetch(`/api/appointments/${appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });

      if (response.ok) {
        toast({
          title: "Appointment Updated",
          description: "The appointment has been updated successfully.",
        });
        setEditDialogOpen(false);
        fetchAppointment();
      } else {
        const data = await response.json();
        toast({
          title: "Error",
          description: data.error || "Failed to update appointment",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error updating appointment:", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CONFIRMED":
        return <Badge variant="success">Confirmed</Badge>;
      case "PENDING":
        return <Badge variant="warning">Pending</Badge>;
      case "COMPLETED":
        return <Badge variant="info">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <Card>
        <CardContent className="py-12 text-center">
          <AlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700">Appointment not found</h3>
          <Link href="/dashboard/appointments">
            <Button className="mt-4">Back to Appointments</Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link href="/dashboard/appointments">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold text-slate-800">
              {appointment?.treatmentType ?? "Appointment"}
            </h1>
            {getStatusBadge(appointment?.status ?? "")}
          </div>
          <p className="text-slate-600 mt-1">
            {new Date(appointment?.dateTime ?? "").toLocaleDateString("en-GB", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}{" "}
            at{" "}
            {new Date(appointment?.dateTime ?? "").toLocaleTimeString("en-GB", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </p>
        </div>
        {/* Edit Button (for therapists, if not cancelled/completed) */}
        {isTherapist && appointment?.status !== "CANCELLED" && appointment?.status !== "COMPLETED" && (
          <Button variant="outline" onClick={openEditDialog} className="gap-2">
            <Edit className="h-4 w-4" />
            Edit
          </Button>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Appointment Details */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-primary" />
                  Appointment Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Clock className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Duration</p>
                      <p className="font-medium text-slate-800">
                        {appointment?.duration ?? 60} minutes
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-emerald-100 flex items-center justify-center">
                      <CreditCard className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div>
                      <p className="text-sm text-slate-500">Price</p>
                      <p className="font-medium text-slate-800">
                        £{(appointment?.price ?? 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Patient Info (for therapists) */}
                {isTherapist && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-slate-800 mb-3">Patient Information</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                        <User className="h-6 w-6 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {appointment?.patient?.firstName ?? ""} {appointment?.patient?.lastName ?? ""}
                        </p>
                        <p className="text-sm text-slate-500">
                          {appointment?.patient?.email ?? ""}
                        </p>
                        {appointment?.patient?.phone && (
                          <p className="text-sm text-slate-500">
                            {appointment.patient.phone}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <Link href={`/dashboard/patients/${appointment?.patient?.id}`}>
                        <Button variant="outline" size="sm">
                          View Patient Profile
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                {/* Therapist Info (for patients) */}
                {!isTherapist && (
                  <div className="border-t pt-4 mt-4">
                    <h4 className="font-medium text-slate-800 mb-3">Your Therapist</h4>
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center">
                        <User className="h-6 w-6 text-emerald-600" />
                      </div>
                      <div>
                        <p className="font-medium text-slate-800">
                          {appointment?.therapist?.firstName ?? ""} {appointment?.therapist?.lastName ?? ""}
                        </p>
                        <p className="text-sm text-slate-500">
                          Physiotherapist
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Clinical Notes */}
          {appointment?.soapNote && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="h-5 w-5 text-primary" />
                    Clinical Notes
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-slate-600 mb-4">
                    Clinical notes have been recorded for this appointment.
                  </p>
                  <Link href={`/dashboard/clinical-notes/${appointment.soapNote.id}`}>
                    <Button variant="outline" className="gap-2">
                      <FileText className="h-4 w-4" />
                      View Clinical Notes
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Create SOAP Note Button (for therapists, completed appointments without notes) */}
          {isTherapist && appointment?.status === "COMPLETED" && !appointment?.soapNote && (
            <div>
              <Card className="border-primary/50 bg-primary/5">
                <CardContent className="py-6">
                  <div className="text-center">
                    <FileText className="h-10 w-10 text-primary mx-auto mb-3" />
                    <h3 className="font-semibold text-slate-800 mb-2">
                      Create Clinical Notes
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                      Document the treatment session with SOAP notes.
                    </p>
                    <Link
                      href={`/dashboard/clinical-notes/create?appointmentId=${appointment.id}&patientId=${appointment?.patient?.id}`}
                    >
                      <Button className="gap-2">
                        <Edit className="h-4 w-4" />
                        Create SOAP Note
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Payment Status */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <CreditCard className="h-5 w-5 text-primary" />
                  Payment
                </CardTitle>
              </CardHeader>
              <CardContent>
                {appointment?.payment?.status === "SUCCEEDED" ? (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-3">
                      <CheckCircle className="h-6 w-6 text-emerald-600" />
                    </div>
                    <p className="font-medium text-emerald-600">Payment Complete</p>
                    <p className="text-2xl font-bold text-slate-800 mt-2">
                      £{(appointment?.payment?.amount ?? 0).toFixed(2)}
                    </p>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-3">
                      <AlertCircle className="h-6 w-6 text-amber-600" />
                    </div>
                    <p className="font-medium text-amber-600">Payment Pending</p>
                    <p className="text-2xl font-bold text-slate-800 mt-2">
                      £{(appointment?.price ?? 0).toFixed(2)}
                    </p>
                    {!isTherapist && appointment?.status !== "CANCELLED" && (
                      <Button
                        className="w-full mt-4 gap-2"
                        onClick={handleProceedToPayment}
                        disabled={updating}
                      >
                        {updating ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CreditCard className="h-4 w-4" />
                        )}
                        Pay Now
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Status Management (for therapists) */}
          {isTherapist && (
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Update Status</CardTitle>
                </CardHeader>
                <CardContent>
                  <Select
                    value={appointment?.status ?? ""}
                    onValueChange={handleUpdateStatus}
                    disabled={updating}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                      <SelectItem value="COMPLETED">Completed</SelectItem>
                      <SelectItem value="CANCELLED">Cancelled</SelectItem>
                      <SelectItem value="NO_SHOW">No Show</SelectItem>
                    </SelectContent>
                  </Select>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Cancel Button (for patients) — with 48h policy */}
          {!isTherapist &&
            (appointment?.status === "PENDING" || appointment?.status === "CONFIRMED") && (
              <div>
                <Card className="border-red-200">
                  <CardContent className="py-4 space-y-3">
                    {(() => {
                      const hoursUntil = (new Date(appointment.dateTime).getTime() - Date.now()) / (1000 * 60 * 60);
                      const within48h = hoursUntil < 48;
                      return (
                        <>
                          <div className={`rounded-lg p-3 text-xs flex items-start gap-2 ${within48h ? "bg-red-50 border border-red-200 text-red-700" : "bg-green-50 border border-green-200 text-green-700"}`}>
                            <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-semibold">{within48h ? "No refund available" : "Full refund eligible"}</p>
                              <p>{within48h ? `Appointment is in ${Math.round(hoursUntil)}h — within 48h window.` : `Appointment is in ${Math.round(hoursUntil)}h — eligible for full refund.`}</p>
                            </div>
                          </div>
                          <Button
                            variant="outline"
                            className="w-full border-red-200 text-red-600 hover:bg-red-50"
                            onClick={() => { setCancelDialogOpen(true); setCancelResult(null); setCancelReason(""); }}
                          >
                            <XCircle className="h-4 w-4 mr-2" />
                            Request Cancellation
                          </Button>
                          <a href="/cancellation-policy" target="_blank" className="flex items-center justify-center gap-1 text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                            <ExternalLink className="h-3 w-3" /> View cancellation policy
                          </a>
                        </>
                      );
                    })()}
                  </CardContent>
                </Card>
              </div>
            )}
        </div>
      </div>

      {/* Cancellation Request Dialog */}
      <Dialog open={cancelDialogOpen} onOpenChange={setCancelDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              Request Cancellation
            </DialogTitle>
            <DialogDescription>
              Submit a cancellation request. Our team will review it according to our cancellation policy.
            </DialogDescription>
          </DialogHeader>

          {cancelResult ? (
            <div className="space-y-4 py-2">
              {cancelResult.success ? (
                <div className={`rounded-xl p-4 border text-sm space-y-2 ${
                  cancelResult.refundEligible
                    ? "bg-green-50 border-green-200 text-green-800"
                    : "bg-amber-50 border-amber-200 text-amber-800"
                }`}>
                  <p className="font-semibold flex items-center gap-2">
                    <CheckCircle className="h-4 w-4" />
                    Request Submitted
                  </p>
                  <p>{cancelResult.policyMessage}</p>
                  {cancelResult.refundEligible && cancelResult.refundAmount && (
                    <p className="font-bold">Eligible refund: £{cancelResult.refundAmount.toFixed(2)}</p>
                  )}
                </div>
              ) : (
                <div className="rounded-xl p-4 border bg-red-50 border-red-200 text-red-800 text-sm">
                  <p className="font-semibold">Error</p>
                  <p>{cancelResult.error}</p>
                </div>
              )}
              <Button className="w-full" onClick={() => setCancelDialogOpen(false)}>Close</Button>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {/* 48h policy indicator */}
              {appointment && (() => {
                const hoursUntil = (new Date(appointment.dateTime).getTime() - Date.now()) / (1000 * 60 * 60);
                const within48h = hoursUntil < 48;
                return (
                  <div className={`rounded-xl p-3 border text-xs flex items-start gap-2 ${
                    within48h ? "bg-red-50 border-red-200 text-red-700" : "bg-green-50 border-green-200 text-green-700"
                  }`}>
                    <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold">
                        {within48h ? "⚠ Within 48-hour window — no refund" : "✓ More than 48 hours — full refund eligible"}
                      </p>
                      <p className="mt-0.5">
                        {within48h
                          ? `Your appointment is in ${Math.round(hoursUntil)} hours. Under our policy, cancellations within 48 hours are non-refundable.`
                          : `Your appointment is in ${Math.round(hoursUntil)} hours. You are eligible for a full refund of £${appointment.price.toFixed(2)}.`
                        }
                      </p>
                    </div>
                  </div>
                );
              })()}

              <div className="space-y-2">
                <Label htmlFor="cancelReason">Reason for cancellation <span className="text-red-500">*</span></Label>
                <Textarea
                  id="cancelReason"
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  rows={3}
                  placeholder="Please explain why you need to cancel this appointment..."
                />
              </div>

              <p className="text-[11px] text-muted-foreground">
                By submitting this request you confirm you have read our{" "}
                <a href="/cancellation-policy" target="_blank" className="underline text-[#5dc9c0]">Cancellation Policy</a>.
                Our team will review your request and contact you within 1 business day.
              </p>
            </div>
          )}

          {!cancelResult && (
            <DialogFooter>
              <Button variant="outline" onClick={() => setCancelDialogOpen(false)} disabled={cancelSubmitting}>Back</Button>
              <Button
                variant="destructive"
                disabled={cancelSubmitting || !cancelReason.trim()}
                onClick={async () => {
                  setCancelSubmitting(true);
                  try {
                    const res = await fetch("/api/patient/cancellation", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ appointmentId: appointment?.id, reason: cancelReason }),
                    });
                    const data = await res.json();
                    setCancelResult(data);
                  } catch {
                    setCancelResult({ error: "Failed to submit request. Please try again." });
                  } finally {
                    setCancelSubmitting(false);
                  }
                }}
              >
                {cancelSubmitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Submit Cancellation Request
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Appointment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Appointment</DialogTitle>
            <DialogDescription>
              Update the appointment details below. The patient will be notified of any changes.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dateTime">Date & Time</Label>
              <Input
                id="dateTime"
                type="datetime-local"
                value={editForm.dateTime}
                onChange={(e) =>
                  setEditForm({ ...editForm, dateTime: e.target.value })
                }
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="duration">Duration (minutes)</Label>
                <Input
                  id="duration"
                  type="number"
                  min="15"
                  step="15"
                  value={editForm.duration}
                  onChange={(e) =>
                    setEditForm({ ...editForm, duration: parseInt(e.target.value) || 60 })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="price">Price (£)</Label>
                <Input
                  id="price"
                  type="number"
                  min="0"
                  step="0.01"
                  value={editForm.price}
                  onChange={(e) =>
                    setEditForm({ ...editForm, price: parseFloat(e.target.value) || 0 })
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="treatmentType">Treatment Type</Label>
              <Input
                id="treatmentType"
                value={editForm.treatmentType}
                onChange={(e) =>
                  setEditForm({ ...editForm, treatmentType: e.target.value })
                }
                placeholder="e.g., Physiotherapy Session, Sports Massage"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                value={editForm.notes}
                onChange={(e) =>
                  setEditForm({ ...editForm, notes: e.target.value })
                }
                placeholder="Add any notes or special instructions..."
                rows={4}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setEditDialogOpen(false)}
              disabled={updating}
            >
              Cancel
            </Button>
            <Button onClick={handleEditAppointment} disabled={updating}>
              {updating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
