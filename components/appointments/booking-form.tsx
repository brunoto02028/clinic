"use client";

import { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  ArrowLeft,
  ArrowRight,
  Check,
  Loader2,
  AlertTriangle,
  CheckCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { useLocale } from "@/hooks/use-locale";

export default function BookingForm() {
  const { locale } = useLocale();
  const isPt = locale === "pt-BR";
  const [step, setStep] = useState(1); // 1=Date, 2=Time, 3=Done
  const [loading, setLoading] = useState(false);

  const [selectedDate, setSelectedDate] = useState<string>("");
  const [selectedTime, setSelectedTime] = useState<string>("");
  const [createdAppointmentId, setCreatedAppointmentId] = useState<string>("");
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [noAvailability, setNoAvailability] = useState(false);
  const [consultationPrice, setConsultationPrice] = useState<number | null>(null);

  useEffect(() => {
    fetchAvailableDates();
    fetch("/api/patient/service-prices")
      .then(r => r.json())
      .then((data: any[]) => {
        const consultation = data?.find((p: any) => p.serviceType === "CONSULTATION");
        if (consultation?.price) setConsultationPrice(consultation.price);
      })
      .catch(() => {});
  }, []);

  const fetchAvailableDates = async () => {
    const today = new Date();
    const checks: string[] = [];
    for (let i = 0; i < 29; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() + i);
      checks.push(d.toISOString().split("T")[0]);
    }
    try {
      const results = await Promise.all(
        checks.map(date =>
          fetch(`/api/availability?date=${date}&duration=60`)
            .then(r => r.json())
            .catch(() => ({ available: false }))
        )
      );
      const dates = checks.filter((_, idx) => results[idx]?.available && results[idx]?.slots?.length > 0);
      setAvailableDates(dates);
      if (dates.length === 0) setNoAvailability(true);
    } catch {
      setNoAvailability(true);
    }
  };

  const fetchSlotsForDate = async (date: string) => {
    setSlotsLoading(true);
    setAvailableSlots([]);
    setSelectedTime("");
    try {
      const res = await fetch(`/api/availability?date=${date}&duration=60`);
      const data = await res.json();
      setAvailableSlots(data?.slots ?? []);
    } catch {
      setAvailableSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  };

  const handleConfirmBooking = async () => {
    setLoading(true);
    try {
      const dateTime = new Date(`${selectedDate}T${selectedTime}:00`);
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateTime: dateTime.toISOString(),
          duration: 60,
          treatmentType: "Consultation",
          price: consultationPrice ?? 0,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Failed");
      setCreatedAppointmentId(data?.appointment?.id ?? "");
      setStep(3);
    } catch (err: any) {
      alert(isPt ? "Falha ao criar consulta. Tente novamente." : "Failed to book appointment. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard/appointments">
          <Button variant="ghost" size="icon" className="flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-foreground">
            {isPt ? "Agendar Consulta" : "Book an Appointment"}
          </h1>
          <p className="text-sm text-muted-foreground">
            {isPt ? "Escolha o dia e horário disponíveis" : "Choose an available date and time"}
          </p>
        </div>
      </div>

      {/* Progress */}
      <div className="flex items-center px-2">
        {[1, 2, 3].map((s) => (
          <div key={s} className="flex items-center flex-1 last:flex-none">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-colors flex-shrink-0 ${
              step >= s ? "bg-primary text-white" : "bg-muted text-muted-foreground"
            }`}>
              {step > s ? <Check className="h-4 w-4" /> : s}
            </div>
            {s < 3 && <div className={`flex-1 h-1 mx-2 transition-colors ${step > s ? "bg-primary" : "bg-muted"}`} />}
          </div>
        ))}
      </div>

      {/* Step 1: Select Date */}
      {step === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              {isPt ? "Escolha uma Data" : "Choose a Date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {availableDates.length === 0 && !noAvailability ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isPt ? "A verificar disponibilidade..." : "Checking availability..."}
                </span>
              </div>
            ) : noAvailability ? (
              <div className="text-center py-10">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-3" />
                <p className="text-muted-foreground text-sm">
                  {isPt
                    ? "Sem datas disponíveis neste momento. Contacte a clínica."
                    : "No available dates at the moment. Please contact the clinic."}
                </p>
                <a href="mailto:admin@bpr.rehab" className="text-primary text-sm hover:underline mt-2 inline-block">
                  admin@bpr.rehab
                </a>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-2">
                {availableDates.map((date) => {
                  const d = new Date(date + "T12:00:00");
                  const todayStr = new Date().toISOString().split("T")[0];
                  const isToday = date === todayStr;
                  return (
                    <div
                      key={date}
                      onClick={() => { setSelectedDate(date); fetchSlotsForDate(date); }}
                      className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all relative ${
                        selectedDate === date
                          ? "border-primary bg-primary/10"
                          : isToday
                          ? "border-primary/40 bg-primary/5 hover:border-primary/70"
                          : "border-border hover:border-primary/50"
                      }`}
                    >
                      {isToday && (
                        <span className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                          {isPt ? "Hoje" : "Today"}
                        </span>
                      )}
                      <p className="text-xs text-muted-foreground">
                        {d.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { weekday: "short" })}
                      </p>
                      <p className={`font-bold text-lg ${isToday ? "text-primary" : "text-foreground"}`}>{d.getDate()}</p>
                      <p className="text-xs text-muted-foreground">
                        {d.toLocaleDateString(isPt ? "pt-BR" : "en-GB", { month: "short" })}
                      </p>
                    </div>
                  );
                })}
              </div>
            )}
            <div className="mt-6">
              <Button
                className="w-full gap-2"
                disabled={!selectedDate}
                onClick={() => setStep(2)}
              >
                {isPt ? "Continuar" : "Continue"}
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 2: Select Time */}
      {step === 2 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-primary" />
              {isPt ? "Escolha o Horário" : "Choose a Time"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-4">
              {new Date(selectedDate + "T12:00:00").toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                weekday: "long", day: "numeric", month: "long", year: "numeric",
              })}
            </p>
            {slotsLoading ? (
              <div className="flex items-center justify-center py-10">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
                <span className="ml-2 text-sm text-muted-foreground">
                  {isPt ? "A carregar horários..." : "Loading times..."}
                </span>
              </div>
            ) : availableSlots.length === 0 ? (
              <div className="text-center py-8">
                <AlertTriangle className="h-8 w-8 text-amber-400 mx-auto mb-2" />
                <p className="text-muted-foreground text-sm">
                  {isPt ? "Sem horários disponíveis nesta data." : "No slots available on this date."}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-4 sm:grid-cols-5 gap-2">
                {availableSlots.map((time) => (
                  <div
                    key={time}
                    onClick={() => setSelectedTime(time)}
                    className={`p-3 rounded-lg border-2 cursor-pointer text-center transition-all ${
                      selectedTime === time
                        ? "border-primary bg-primary/10"
                        : "border-border hover:border-primary/50"
                    }`}
                  >
                    <p className="font-semibold text-sm text-foreground">{time}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Summary before confirm */}
            {selectedTime && (
              <div className="mt-5 p-4 bg-muted/30 rounded-lg text-sm space-y-1">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isPt ? "Data" : "Date"}</span>
                  <span className="font-medium">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                      day: "numeric", month: "short", year: "numeric",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isPt ? "Horário" : "Time"}</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isPt ? "Duração" : "Duration"}</span>
                  <span className="font-medium">60 {isPt ? "minutos" : "min"}</span>
                </div>
                {consultationPrice != null && (
                  <div className="flex justify-between pt-2 border-t mt-2">
                    <span className="font-semibold">{isPt ? "Preço estimado" : "Estimated price"}</span>
                    <span className="font-bold text-primary">£{consultationPrice}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex gap-3 mt-5">
              <Button variant="outline" onClick={() => setStep(1)}>
                {isPt ? "Voltar" : "Back"}
              </Button>
              <Button
                className="flex-1 gap-2"
                disabled={!selectedTime || loading}
                onClick={handleConfirmBooking}
              >
                {loading ? (
                  <><Loader2 className="h-4 w-4 animate-spin" /> {isPt ? "A confirmar..." : "Confirming..."}</>
                ) : (
                  <>{isPt ? "Confirmar Pedido" : "Confirm Request"} <ArrowRight className="h-4 w-4" /></>
                )}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3: Confirmed */}
      {step === 3 && (
        <Card>
          <CardContent className="pt-8 pb-8">
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-500/15 flex items-center justify-center mx-auto mb-4">
                <CheckCircle className="h-9 w-9 text-emerald-500" />
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-2">
                {isPt ? "Pedido Enviado!" : "Request Sent!"}
              </h3>
              <p className="text-muted-foreground text-sm mb-6 max-w-sm mx-auto">
                {isPt
                  ? "Recebemos o seu pedido de consulta. Irá receber um email de confirmação com os detalhes e o link de pagamento."
                  : "We've received your appointment request. You'll receive a confirmation email with details and a payment link shortly."}
              </p>
              <div className="bg-muted/30 rounded-lg p-4 mb-6 text-sm text-left space-y-2">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isPt ? "Data" : "Date"}</span>
                  <span className="font-medium">
                    {new Date(selectedDate + "T12:00:00").toLocaleDateString(isPt ? "pt-BR" : "en-GB", {
                      weekday: "long", day: "numeric", month: "long",
                    })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">{isPt ? "Horário" : "Time"}</span>
                  <span className="font-medium">{selectedTime}</span>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link href="/dashboard/appointments" className="flex-1">
                  <Button variant="outline" className="w-full">
                    {isPt ? "Ver Consultas" : "View Appointments"}
                  </Button>
                </Link>
                {createdAppointmentId && (
                  <Link href={`/dashboard/appointments/${createdAppointmentId}`} className="flex-1">
                    <Button className="w-full">
                      {isPt ? "Ver Detalhes" : "View Details"}
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
