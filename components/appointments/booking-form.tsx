"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar,
  Clock,
  CreditCard,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  Info,
  Shield,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TREATMENT_OPTIONS } from "@/lib/types";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export default function BookingForm() {
  const router = useRouter();
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [screeningComplete, setScreeningComplete] = useState(true);

  const [selectedTreatment, setSelectedTreatment] = useState<string>("");
  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string>("");
  const [isCustomTreatment, setIsCustomTreatment] = useState(false);
  const [customTreatment, setCustomTreatment] = useState({
    name: "",
    duration: 60,
    price: 0,
  });

  useEffect(() => {
    setMounted(true);
    fetch("/api/patient/status").then(r => r.json()).then(d => {
      if (d.screeningComplete !== undefined) setScreeningComplete(d.screeningComplete);
    }).catch(() => {});
  }, []);

  const treatment = isCustomTreatment
    ? {
        id: "custom",
        name: customTreatment.name,
        duration: customTreatment.duration,
        price: customTreatment.price,
        description: "Custom treatment",
      }
    : TREATMENT_OPTIONS.find((t) => t.id === selectedTreatment);

  // Generate available dates (next 14 days, excluding Sundays)
  const getAvailableDates = () => {
    const dates: string[] = [];
    const today = new Date();
    today.setDate(today.getDate() + 1); // Start from tomorrow

    for (let i = 0; i < 14; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() + i);
      // Exclude Sundays
      if (date.getDay() !== 0) {
        dates.push(date.toISOString().split("T")[0]);
      }
    }
    return dates;
  };

  // Generate time slots (9am - 5pm, 30 min intervals)
  const getTimeSlots = () => {
    const slots: string[] = [];
    for (let hour = 9; hour < 17; hour++) {
      slots.push(`${hour.toString().padStart(2, "0")}:00`);
      slots.push(`${hour.toString().padStart(2, "0")}:30`);
    }
    return slots;
  };

  const handleCreateAppointment = async () => {
    setLoading(true);
    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);

      const response = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          duration: treatment?.duration ?? 60,
          treatmentType: treatment?.name ?? "Appointment",
          price: treatment?.price ?? 60,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || (isPt ? "Falha ao criar consulta" : "Failed to create appointment"));
      }

      setCreatedAppointmentId(data?.appointment?.id ?? "");
      setStep(4);
    } catch (error) {
      console.error("Error creating appointment:", error);
      alert(isPt ? "Falha ao criar consulta. Tente novamente." : "Failed to create appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleProceedToPayment = async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/payments/create-checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId: createdAppointmentId,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || (isPt ? "Falha ao criar sessão de pagamento" : "Failed to create payment session"));
      }

      // Redirect to Stripe checkout
      if (data?.checkoutUrl) {
        window.location.href = data.checkoutUrl;
      }
    } catch (error) {
      console.error("Error creating payment session:", error);
      alert(isPt ? "Falha ao iniciar pagamento. Tente novamente." : "Failed to initiate payment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/appointments">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">{isPt ? "Agendar Consulta" : "Book Appointment"}</h1>
          <p className="text-sm text-muted-foreground">{isPt ? "Selecione seu tratamento e horário preferido" : "Select your treatment and preferred time"}</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between px-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center flex-1">
            <div
              className={`w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-xs sm:text-sm font-medium transition-colors flex-shrink-0 ${
                step >= s
                  ? "bg-primary text-white"
                  : "bg-muted text-muted-foreground"
              }`}
            >
              {step > s ? <Check className="h-3 w-3 sm:h-4 sm:w-4" /> : s}
            </div>
            {s < 4 && (
              <div
                className={`flex-1 h-1 mx-1 sm:mx-2 transition-colors ${
                  step > s ? "bg-primary" : "bg-muted"
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Step 1: Select Treatment */}
      {step === 1 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Info className="h-5 w-5 text-primary" />
                {isPt ? "Selecionar Tratamento" : "Select Treatment"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {TREATMENT_OPTIONS.map((t) => (
                <div
                  key={t.id}
                  onClick={() => {
                    setSelectedTreatment(t.id);
                    setIsCustomTreatment(false);
                  }}
                  className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTreatment === t.id && !isCustomTreatment
                      ? "border-primary bg-primary/5"
                      : "border-white/10 hover:border-primary/50"
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-foreground">{isPt && t.namePt ? t.namePt : t.name}</h3>
                      <p className="text-sm text-muted-foreground mt-1">
                        {isPt && t.descriptionPt ? t.descriptionPt : t.description}
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        {isPt ? "Duração" : "Duration"}: {t.duration} {isPt ? "minutos" : "minutes"}
                      </p>
                    </div>
                    <p className="font-bold text-lg text-primary">
                      £{t.price}
                    </p>
                  </div>
                </div>
              ))}

              {/* Personalised Treatment CTA */}
              <div className="p-4 rounded-lg border-2 border-dashed border-white/10 bg-muted/20">
                <h3 className="font-semibold text-foreground mb-2">
                  {isPt ? "Tratamento Personalizado" : "Personalised Treatment"}
                </h3>
                <p className="text-sm text-muted-foreground mb-3">
                  {isPt
                    ? "Precisa de um tratamento diferente? O seu terapeuta pode criar um plano personalizado para si."
                    : "Need a different treatment? Your therapist can create a personalised plan for you."}
                </p>
                <a
                  href={isPt ? "mailto:support@bpr.rehab?subject=Solicita%C3%A7%C3%A3o%20de%20Tratamento%20Personalizado" : "mailto:support@bpr.rehab?subject=Personalised%20Treatment%20Request"}
                  className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline"
                >
                  {isPt ? "Contactar o Terapeuta →" : "Contact Your Therapist →"}
                </a>
              </div>

              <Button
                className="w-full mt-4 gap-2"
                disabled={
                  isCustomTreatment
                    ? !customTreatment.name.trim()
                    : !selectedTreatment
                }
                onClick={() => setStep(2)}
              >
                {isPt ? "Continuar" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 2: Select Date */}
      {step === 2 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                {isPt ? "Selecionar Data" : "Select Date"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2 sm:gap-3">
                {getAvailableDates().map((date) => {
                  const dateObj = new Date(date);
                  return (
                    <div
                      key={date}
                      onClick={() => setSelectedDate(date)}
                      className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                        selectedDate === date
                          ? "border-primary bg-primary/5"
                          : "border-white/10 hover:border-primary/50"
                      }`}
                    >
                      <p className="text-sm text-muted-foreground">
                        {dateObj.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { weekday: "short" })}
                      </p>
                      <p className="font-semibold text-lg text-foreground">
                        {dateObj.getDate()}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dateObj.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { month: "short" })}
                      </p>
                    </div>
                  );
                })}
              </div>

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(1)}>
                  {isPt ? "Voltar" : "Back"}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!selectedDate}
                  onClick={() => setStep(3)}
                >
                  {isPt ? "Continuar" : "Continue"}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 3: Select Time */}
      {step === 3 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                {isPt ? "Selecionar Horário" : "Select Time"}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 sm:gap-3">
                {getTimeSlots().map((time) => (
                  <div
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      selectedTime === time
                        ? "border-primary bg-primary/5"
                        : "border-white/10 hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-foreground">{time}</p>
                  </div>
                ))}
              </div>

              {/* Summary */}
              {selectedTime && (
                <div className="mt-6 p-4 bg-muted/30 rounded-lg">
                  <h3 className="font-semibold text-foreground mb-2">{isPt ? "Resumo do Agendamento" : "Booking Summary"}</h3>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <p>
                      <span className="font-medium">{isPt ? "Tratamento:" : "Treatment:"}</span> {treatment?.name ?? ""}
                    </p>
                    <p>
                      <span className="font-medium">{isPt ? "Data:" : "Date:"}</span>{" "}
                      {new Date(selectedDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                        weekday: "long",
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      <span className="font-medium">{isPt ? "Horário:" : "Time:"}</span> {selectedTime}
                    </p>
                    <p>
                      <span className="font-medium">{isPt ? "Duração:" : "Duration:"}</span> {treatment?.duration ?? 60} {isPt ? "minutos" : "minutes"}
                    </p>
                    <p className="text-lg font-bold text-primary mt-2">
                      Total: £{treatment?.price ?? 60}
                    </p>
                  </div>
                </div>
              )}

              <div className="flex gap-3 mt-6">
                <Button variant="outline" onClick={() => setStep(2)}>
                  {isPt ? "Voltar" : "Back"}
                </Button>
                <Button
                  className="flex-1 gap-2"
                  disabled={!selectedTime || loading}
                  onClick={handleCreateAppointment}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {isPt ? "Criando..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      {isPt ? "Confirmar Agendamento" : "Confirm Booking"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Step 4: Payment */}
      {step === 4 && (
        <div>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {treatment?.price === 0 ? (
                  <Check className="h-5 w-5 text-emerald-600" />
                ) : (
                  <CreditCard className="h-5 w-5 text-primary" />
                )}
                {treatment?.price === 0 ? (isPt ? "Agendamento Confirmado" : "Booking Confirmed") : (isPt ? "Completar Pagamento" : "Complete Payment")}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center py-6">
                <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                  <Check className="h-8 w-8 text-emerald-600" />
                </div>
                <h3 className="text-xl font-semibold text-foreground mb-2">
                  {isPt ? (treatment?.price === 0 ? "Consulta Confirmada!" : "Consulta Criada!") : `Appointment ${treatment?.price === 0 ? "Confirmed" : "Created"}!`}
                </h3>
                <p className="text-muted-foreground mb-6">
                  {treatment?.price === 0
                    ? (isPt ? "Sua consulta gratuita foi agendada com sucesso." : "Your free appointment has been booked successfully.")
                    : (isPt ? "Sua consulta foi reservada. Complete o pagamento para confirmar seu agendamento." : "Your appointment has been reserved. Complete payment to confirm your booking.")}
                </p>

                <div className="bg-muted/30 rounded-lg p-4 mb-6 text-left">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Tratamento" : "Treatment"}</span>
                      <span className="font-medium">{treatment?.name ?? ""}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Data" : "Date"}</span>
                      <span className="font-medium">
                        {new Date(selectedDate).toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">{isPt ? "Horário" : "Time"}</span>
                      <span className="font-medium">{selectedTime}</span>
                    </div>
                    <div className="border-t pt-2 mt-2">
                      <div className="flex justify-between text-base">
                        <span className="font-semibold">Total</span>
                        <span className="font-bold text-primary">£{treatment?.price ?? 60}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Screening reminder */}
                {!screeningComplete && (
                  <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4 mb-6 flex items-start gap-3 text-left">
                    <Shield className="h-5 w-5 text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-semibold text-red-300 text-sm">{isPt ? "Triagem Médica Necessária" : "Medical Screening Required"}</p>
                      <p className="text-xs text-red-400/80 mt-1">{isPt ? "Complete sua triagem médica pelo menos 24 horas antes da consulta para evitar reagendamento." : "Complete your medical screening at least 24 hours before your appointment to avoid rescheduling."}</p>
                      <Link href="/dashboard/screening">
                        <Button size="sm" variant="outline" className="mt-2 gap-1 border-red-500/20 text-red-400 hover:bg-red-500/10 text-xs">
                          <Shield className="h-3 w-3" /> {isPt ? "Completar Triagem" : "Complete Screening"}
                        </Button>
                      </Link>
                    </div>
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-3">
                  {treatment?.price === 0 ? (
                    // Free appointment - just go to appointment details
                    <Link href={`/dashboard/appointments/${createdAppointmentId}`} className="w-full">
                      <Button className="w-full">
                        {isPt ? "Ver Consulta" : "View Appointment"}
                      </Button>
                    </Link>
                  ) : (
                    // Paid appointment - show payment options
                    <>
                      <Link href={`/dashboard/appointments/${createdAppointmentId}`} className="flex-1">
                        <Button variant="outline" className="w-full">
                          {isPt ? "Pagar Depois" : "Pay Later"}
                        </Button>
                      </Link>
                      <Button
                        className="flex-1 gap-2"
                        disabled={loading}
                        onClick={handleProceedToPayment}
                      >
                        {loading ? (
                          <>
                            <Loader2 className="h-4 w-4 animate-spin" />
                            {isPt ? "Processando..." : "Processing..."}
                          </>
                        ) : (
                          <>
                            <CreditCard className="h-4 w-4" />
                            {isPt ? "Pagar Agora" : "Pay Now"}
                          </>
                        )}
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
