"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Plus, Edit, Trash2, Loader2, Stethoscope, Clock, Percent,
  GripVertical, Eye, EyeOff, Tag,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";

interface TreatmentType {
  id: string;
  name: string;
  namePt: string | null;
  description: string | null;
  category: string;
  requiresInPerson: boolean;
  duration: number;
  price: number;
  discountPercent: number;
  currency: string;
  isActive: boolean;
  sortOrder: number;
}

const CATEGORIES = [
  { value: "ASSESSMENT_SERVICE", label: "Assessment", labelPt: "Avaliação" },
  { value: "MANUAL_THERAPY", label: "Manual Therapy", labelPt: "Terapia Manual" },
  { value: "ELECTROTHERAPY", label: "Electrotherapy", labelPt: "Eletroterapia" },
  { value: "EXERCISE_THERAPY", label: "Exercise Therapy", labelPt: "Terapia por Exercício" },
  { value: "CONSULTATION", label: "Consultation", labelPt: "Consulta" },
  { value: "OTHER", label: "Other", labelPt: "Outro" },
];

const emptyForm = {
  name: "", namePt: "", description: "", category: "OTHER",
  requiresInPerson: true, duration: 60, price: 60, discountPercent: 0, sortOrder: 0,
};

export default function TreatmentTypesPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const isPt = locale === "pt-BR";
  const { toast } = useToast();

  const [treatments, setTreatments] = useState<TreatmentType[]>([]);
  const [loading, setLoading] = useState(true);
  const [showDialog, setShowDialog] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [editing, setEditing] = useState<TreatmentType | null>(null);
  const [deleting, setDeleting] = useState<TreatmentType | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => { fetchTreatments(); }, []);

  const fetchTreatments = async () => {
    try {
      const res = await fetch("/api/admin/treatment-types");
      if (res.ok) setTreatments(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const openCreate = () => { setEditing(null); setForm(emptyForm); setShowDialog(true); };
  const openEdit = (t: TreatmentType) => {
    setEditing(t);
    setForm({
      name: t.name, namePt: t.namePt || "", description: t.description || "",
      category: t.category, requiresInPerson: t.requiresInPerson,
      duration: t.duration, price: t.price, discountPercent: t.discountPercent,
      sortOrder: t.sortOrder,
    });
    setShowDialog(true);
  };

  const handleSubmit = async () => {
    if (!form.name) {
      toast({ title: "Error", description: "Treatment name is required", variant: "destructive" });
      return;
    }
    setSubmitting(true);
    try {
      const url = editing ? `/api/admin/treatment-types/${editing.id}` : "/api/admin/treatment-types";
      const res = await fetch(url, {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        toast({ title: editing ? "Updated" : "Created", description: `"${form.name}" saved.` });
        setShowDialog(false);
        fetchTreatments();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to save", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to save", variant: "destructive" });
    } finally { setSubmitting(false); }
  };

  const handleToggleActive = async (t: TreatmentType) => {
    try {
      const res = await fetch(`/api/admin/treatment-types/${t.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !t.isActive }),
      });
      if (res.ok) {
        toast({ title: t.isActive ? "Deactivated" : "Activated", description: `"${t.name}" ${t.isActive ? "hidden" : "visible"} to patients.` });
        fetchTreatments();
      }
    } catch {
      toast({ title: "Error", description: "Failed to update", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/treatment-types/${deleting.id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted", description: `"${deleting.name}" removed.` });
        setShowDeleteDialog(false); setDeleting(null); fetchTreatments();
      } else {
        const data = await res.json();
        toast({ title: "Error", description: data.error || "Failed to delete", variant: "destructive" });
      }
    } catch {
      toast({ title: "Error", description: "Failed to delete", variant: "destructive" });
    }
  };

  const getFinalPrice = (price: number, discount: number) => {
    if (!discount || discount <= 0) return price;
    return price * (1 - discount / 100);
  };

  const getCatLabel = (cat: string) => {
    const c = CATEGORIES.find(c => c.value === cat);
    return isPt ? c?.labelPt || cat : c?.label || cat;
  };

  if (loading) return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold flex items-center gap-2"><Stethoscope className="h-6 w-6 text-primary" /> {isPt ? "Tipos de Tratamento" : "Treatment Types"}</h1>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {[...Array(3)].map((_, i) => <Card key={i} className="animate-pulse"><CardContent className="pt-6"><div className="h-24 bg-muted rounded" /></CardContent></Card>)}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold flex items-center gap-2">
            <Stethoscope className="h-5 w-5 sm:h-6 sm:w-6 text-primary" />
            {isPt ? "Tipos de Tratamento" : "Treatment Types"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            {isPt
              ? "Gerencie os tratamentos oferecidos, preços, durações e descontos. Estes aparecem no agendamento de consultas."
              : "Manage offered treatments, prices, durations and discounts. These appear in the appointment booking."}
          </p>
        </div>
        <Button onClick={openCreate} className="gap-2 w-full sm:w-auto">
          <Plus className="h-4 w-4" /> {isPt ? "Novo Tratamento" : "New Treatment"}
        </Button>
      </div>

      {/* List */}
      {treatments.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <Stethoscope className="h-14 w-14 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-1">{isPt ? "Nenhum tratamento cadastrado" : "No treatment types yet"}</h3>
            <p className="text-sm text-muted-foreground mb-4 text-center max-w-xs">
              {isPt ? "Adicione tratamentos para que apareçam nas consultas." : "Add treatment types so they appear in appointment bookings."}
            </p>
            <Button onClick={openCreate} className="gap-2"><Plus className="h-4 w-4" /> {isPt ? "Criar Primeiro" : "Create First"}</Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {treatments.map(t => {
            const finalPrice = getFinalPrice(t.price, t.discountPercent);
            const hasDiscount = t.discountPercent > 0;
            return (
              <Card key={t.id} className={`group transition-colors ${t.isActive ? "" : "opacity-60"}`}>
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Stethoscope className="h-4 w-4 text-primary shrink-0" />
                        <span className="truncate">{t.name}</span>
                      </CardTitle>
                      {t.namePt && <p className="text-xs text-muted-foreground mt-0.5 truncate">{t.namePt}</p>}
                    </div>
                    <div className="flex items-center gap-1 ml-2 shrink-0">
                      <Badge variant="outline" className="text-[10px]">{getCatLabel(t.category)}</Badge>
                      {!t.isActive && <Badge variant="secondary" className="text-[10px]">{isPt ? "Inativo" : "Inactive"}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {/* Price */}
                  <div className="flex items-baseline gap-2">
                    {hasDiscount ? (
                      <>
                        <span className="text-2xl font-bold text-green-500">£{finalPrice.toFixed(2)}</span>
                        <span className="text-sm text-muted-foreground line-through">£{t.price.toFixed(2)}</span>
                        <Badge className="bg-green-500/20 text-green-400 text-[10px]">-{t.discountPercent}%</Badge>
                      </>
                    ) : (
                      <span className="text-2xl font-bold">£{t.price.toFixed(2)}</span>
                    )}
                  </div>
                  {/* Duration */}
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" /> {t.duration} min</span>
                    <span>{t.requiresInPerson ? (isPt ? "Presencial" : "In-Person") : (isPt ? "Online/Presencial" : "Online/In-Person")}</span>
                  </div>
                  {t.description && <p className="text-xs text-muted-foreground line-clamp-2">{t.description}</p>}
                  {/* Actions */}
                  <div className="flex gap-2 pt-1 border-t">
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => openEdit(t)}>
                      <Edit className="h-3 w-3" /> {isPt ? "Editar" : "Edit"}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1" onClick={() => handleToggleActive(t)}>
                      {t.isActive ? <><EyeOff className="h-3 w-3" /> {isPt ? "Desativar" : "Deactivate"}</> : <><Eye className="h-3 w-3" /> {isPt ? "Ativar" : "Activate"}</>}
                    </Button>
                    <Button size="sm" variant="outline" className="text-xs h-7 gap-1 text-destructive ml-auto" onClick={() => { setDeleting(t); setShowDeleteDialog(true); }}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Stethoscope className="h-5 w-5 text-primary" />
              {editing ? (isPt ? "Editar Tratamento" : "Edit Treatment") : (isPt ? "Novo Tratamento" : "New Treatment")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Nome (EN) *" : "Name (EN) *"}</Label>
                <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Initial Assessment" />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Nome (PT)" : "Name (PT)"}</Label>
                <Input value={form.namePt} onChange={e => setForm(f => ({ ...f, namePt: e.target.value }))} placeholder="e.g. Avaliação Inicial" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Descrição" : "Description"}</Label>
              <Textarea value={form.description} onChange={e => setForm(f => ({ ...f, description: e.target.value }))} rows={2} placeholder={isPt ? "Descrição do tratamento..." : "Treatment description..."} />
            </div>
            <div className="space-y-2">
              <Label>{isPt ? "Categoria" : "Category"}</Label>
              <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => <SelectItem key={c.value} value={c.value}>{isPt ? c.labelPt : c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Preço (£)" : "Price (£)"}</Label>
                <Input type="number" step="0.01" min="0" value={form.price} onChange={e => setForm(f => ({ ...f, price: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1"><Percent className="h-3 w-3" /> {isPt ? "Desconto" : "Discount"}</Label>
                <Input type="number" step="1" min="0" max="100" value={form.discountPercent} onChange={e => setForm(f => ({ ...f, discountPercent: parseFloat(e.target.value) || 0 }))} />
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Duração (min)" : "Duration (min)"}</Label>
                <Input type="number" min="5" step="5" value={form.duration} onChange={e => setForm(f => ({ ...f, duration: Number(e.target.value) || 60 }))} />
              </div>
            </div>
            {form.discountPercent > 0 && form.price > 0 && (
              <div className="rounded-lg border border-green-500/30 bg-green-500/5 p-3 flex items-center gap-3">
                <Tag className="h-4 w-4 text-green-400" />
                <div>
                  <p className="text-sm font-medium text-green-400">
                    {isPt ? "Preço com desconto" : "Discounted price"}: £{(form.price * (1 - form.discountPercent / 100)).toFixed(2)}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {isPt ? `Original: £${form.price.toFixed(2)} → ${form.discountPercent}% off` : `Original: £${form.price.toFixed(2)} → ${form.discountPercent}% off`}
                  </p>
                </div>
              </div>
            )}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>{isPt ? "Presencial?" : "In-Person?"}</Label>
                <Select value={form.requiresInPerson ? "true" : "false"} onValueChange={v => setForm(f => ({ ...f, requiresInPerson: v === "true" }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="true">{isPt ? "Sim - Presencial" : "Yes - In-Person"}</SelectItem>
                    <SelectItem value="false">{isPt ? "Não - Online também" : "No - Online too"}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{isPt ? "Ordem" : "Sort Order"}</Label>
                <Input type="number" min="0" value={form.sortOrder} onChange={e => setForm(f => ({ ...f, sortOrder: Number(e.target.value) || 0 }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>{isPt ? "Cancelar" : "Cancel"}</Button>
            <Button onClick={handleSubmit} disabled={submitting} className="gap-2">
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {editing ? (isPt ? "Salvar" : "Save") : (isPt ? "Criar" : "Create")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{isPt ? "Excluir Tratamento?" : "Delete Treatment?"}</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>"{deleting?.name}"</strong> {isPt ? "será permanentemente excluído." : "will be permanently deleted."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setDeleting(null)}>{isPt ? "Cancelar" : "Cancel"}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive hover:bg-destructive/90">{isPt ? "Excluir" : "Delete"}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
