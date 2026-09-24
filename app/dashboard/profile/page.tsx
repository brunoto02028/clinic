'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { User, Camera, Trash2, Globe, Phone, MapPin, Save, CheckCircle, Calendar, Shield, Lock, Eye, EyeOff, AlertCircle, Mail, MessageSquare, MessageCircle, Scale, ArrowRight, Info, Clock } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { t as i18nT } from '@/lib/i18n';
import { useVocab } from "@/hooks/use-vocab";

export default function PatientProfilePage() {
  const { locale: siteLocale } = useLocale();
  const isPt = siteLocale === 'pt-BR';
  const { relabel } = useVocab();
  const T = (key: string) => i18nT(key, siteLocale);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [locale, setLocale] = useState('en-GB');
  const [commPref, setCommPref] = useState('EMAIL');

  // Email change
  const [showEmailSection, setShowEmailSection] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  // Password change
  const [showPwSection, setShowPwSection] = useState(false);
  const [currentPw, setCurrentPw] = useState('');
  const [newPw, setNewPw] = useState('');
  const [confirmPw, setConfirmPw] = useState('');
  const [pwError, setPwError] = useState('');
  const [pwSuccess, setPwSuccess] = useState(false);
  const [pwSaving, setPwSaving] = useState(false);
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);

  // Foto de perfil — a mesma que o app grava, pela mesma rota. Uma foto que
  // aparece num canal aparece no outro.
  const [photoUrl, setPhotoUrl] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);
  const [photoError, setPhotoError] = useState('');
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/patient/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.user);
        setFirstName(d.user?.firstName || '');
        setLastName(d.user?.lastName || '');
        setPhone(d.user?.phone || '');
        setAddress(d.user?.address || '');
        setDateOfBirth(d.user?.dateOfBirth ? d.user.dateOfBirth.split('T')[0] : '');
        setEmergencyName(d.user?.emergencyContactName || '');
        setEmergencyPhone(d.user?.emergencyContactPhone || '');
        setEmergencyRelation(d.user?.emergencyContactRelation || '');
        setLocale(d.user?.preferredLocale || 'en-GB');
        setCommPref(d.user?.communicationPreference || 'EMAIL');
        setPhotoUrl(d.user?.profileImageUrl || null);
      })
      .finally(() => setLoading(false));
  }, []);

  const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

  async function handlePhoto(file: File) {
    // Barrado aqui, o arquivo grande não sobe só para voltar 400 — numa rede
    // ruim isso é meio minuto de espera para nada.
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError(
        isPt ? 'Imagem muito grande (máx. 5 MB).' : 'Image is too large (max 5 MB).'
      );
      if (fileInput.current) fileInput.current.value = '';
      return;
    }
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const form = new FormData();
      form.append('file', file);
      const res = await fetch('/api/patient/profile/photo', { method: 'POST', body: form });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error(data?.error || 'failed');
      // Sessão expirada não dá erro: o middleware redireciona e o `fetch`
      // segue o 307, devolvendo 200 com o HTML do login. `res.ok` fica
      // verdadeiro, e ler `profileImageUrl` de um corpo que não é o nosso
      // apagava a foto da tela sem dizer nada. Só aceita o que veio com a
      // forma certa.
      if (typeof data?.profileImageUrl !== 'string') throw new Error('session');
      setPhotoUrl(data.profileImageUrl);
    } catch (e: any) {
      setPhotoError(
        e?.message === 'session'
          ? isPt
            ? 'Sua sessão expirou. Entre de novo e tente outra vez.'
            : 'Your session expired. Sign in again and retry.'
          : e?.message && e.message !== 'failed'
          ? e.message
          : isPt
          ? 'Não foi possível salvar essa foto.'
          : 'We could not save that photo.'
      );
    } finally {
      setPhotoBusy(false);
      if (fileInput.current) fileInput.current.value = '';
    }
  }

  async function handleRemovePhoto() {
    setPhotoBusy(true);
    setPhotoError('');
    try {
      const res = await fetch('/api/patient/profile/photo', { method: 'DELETE' });
      const data = await res.json().catch(() => null);
      if (!res.ok) throw new Error('failed');
      // A mesma armadilha do envio: sessão expirada devolve 200 com o HTML do
      // login, e sem conferir a forma do corpo a foto sumia da tela como se
      // tivesse sido removida.
      if (!data || !('profileImageUrl' in data)) throw new Error('session');
      setPhotoUrl(null);
    } catch (e: any) {
      setPhotoError(
        e?.message === 'session'
          ? isPt
            ? 'Sua sessão expirou. Entre de novo e tente outra vez.'
            : 'Your session expired. Sign in again and retry.'
          : isPt
          ? 'Não foi possível remover a foto.'
          : 'We could not remove the photo.'
      );
    } finally {
      setPhotoBusy(false);
    }
  }

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError('');
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          phone,
          address,
          preferredLocale: locale,
          dateOfBirth: dateOfBirth || null,
          emergencyContactName: emergencyName || null,
          emergencyContactPhone: emergencyPhone || null,
          emergencyContactRelation: emergencyRelation || null,
          communicationPreference: commPref,
        }),
      });
      // Only `res.ok` was handled, so a 400 did nothing at all: no error, no
      // "saved", and — because the whole form goes in one PATCH — an empty
      // surname silently discarded the phone number edited beside it. The
      // e-mail form in this same file already does it this way.
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const data = await res.json().catch(() => null);
        setSaveError(
          data?.error ||
            (isPt ? 'Não foi possível salvar. Confira os campos.' : 'Could not save. Please check the fields.')
        );
      }
    } catch {
      setSaveError(isPt ? 'Erro de conexão.' : 'Connection error.');
    } finally {
      setSaving(false);
    }
  }

  async function handleEmailChange() {
    setEmailError('');
    setEmailSuccess('');
    if (!newEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      setEmailError(isPt ? 'Digite um email válido.' : 'Enter a valid email address.');
      return;
    }
    if (!emailPassword) {
      setEmailError(isPt ? 'Digite sua senha atual pra confirmar.' : 'Enter your current password to confirm.');
      return;
    }
    setEmailSaving(true);
    try {
      const res = await fetch('/api/patient/change-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail, currentPassword: emailPassword }),
      });
      const data = await res.json();
      if (!res.ok) {
        setEmailError(data.error || (isPt ? 'Erro ao solicitar troca de email.' : 'Failed to request email change.'));
      } else {
        setEmailSuccess(isPt
          ? `Enviamos um link de confirmação para ${newEmail}. Clique nele para concluir a troca.`
          : `We sent a confirmation link to ${newEmail}. Click it to complete the change.`);
        setNewEmail('');
        setEmailPassword('');
      }
    } catch {
      setEmailError(isPt ? 'Erro de conexão.' : 'Connection error.');
    } finally {
      setEmailSaving(false);
    }
  }

  async function handlePasswordChange() {
    setPwError('');
    setPwSuccess(false);
    if (newPw.length < 6) {
      setPwError(isPt ? 'A senha deve ter no mínimo 6 caracteres.' : 'Password must be at least 6 characters.');
      return;
    }
    if (newPw !== confirmPw) {
      setPwError(isPt ? 'As senhas não coincidem.' : 'Passwords do not match.');
      return;
    }
    setPwSaving(true);
    try {
      const res = await fetch('/api/patient/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newPassword: newPw }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPwError(data.error || (isPt ? 'Erro ao alterar senha.' : 'Failed to change password.'));
      } else {
        setPwSuccess(true);
        setCurrentPw('');
        setNewPw('');
        setConfirmPw('');
        setTimeout(() => setPwSuccess(false), 3000);
      }
    } catch {
      setPwError(isPt ? 'Erro de conexão.' : 'Connection error.');
    } finally {
      setPwSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ba1-health" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-primary/10 rounded-xl">
          <User className="h-6 w-6 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{T('profile.title')}</h1>
          <p className="text-sm text-muted-foreground">{T('profile.subtitle')}</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl p-5 flex items-center gap-4">
        {photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt={isPt ? 'Foto de perfil' : 'Profile photo'}
            className="h-16 w-16 rounded-full object-cover border border-border"
          />
        ) : (
          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-7 w-7 text-primary" />
          </div>
        )}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-foreground">
            {isPt ? 'Foto de perfil' : 'Profile photo'}
          </p>
          <p className="text-xs text-muted-foreground">
            {isPt ? 'JPEG, PNG ou WebP, até 5 MB.' : 'JPEG, PNG or WebP, up to 5 MB.'}
          </p>
          {photoError && (
            <p className="text-xs text-destructive mt-1">{photoError}</p>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <input
            ref={fileInput}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void handlePhoto(f);
            }}
          />
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            disabled={photoBusy}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-border text-xs font-medium hover:bg-muted disabled:opacity-50"
          >
            <Camera className="h-3.5 w-3.5" />
            {photoBusy
              ? isPt ? 'Salvando…' : 'Saving…'
              : photoUrl
              ? isPt ? 'Trocar' : 'Change'
              : isPt ? 'Enviar' : 'Upload'}
          </button>
          {photoUrl && (
            <button
              type="button"
              onClick={() => void handleRemovePhoto()}
              disabled={photoBusy}
              aria-label={isPt ? 'Remover foto' : 'Remove photo'}
              className="p-2 rounded-xl border border-border text-muted-foreground hover:text-destructive disabled:opacity-50"
            >
              <Trash2 className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Main profile card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        {/* Header info (read-only) */}
        <div className="bg-primary px-6 py-5">
          <p className="text-white font-semibold text-lg">
            {profile?.firstName} {profile?.lastName}
          </p>
          <p className="text-white/80 text-sm">{profile?.email}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Why complete your profile */}
          <div className="flex gap-3 p-4 rounded-xl bg-primary/5 border border-primary/20">
            <Info className="h-5 w-5 text-primary shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-foreground">
                {isPt ? 'Por que preencher seus dados?' : 'Why complete your profile?'}
              </p>
              <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                {relabel(isPt
                  ? 'Precisamos das suas informações para entrar em contato sobre consultas, enviar resultados de exames e garantir que o seu terapeuta tenha todos os dados necessários para o melhor atendimento. Seus dados são protegidos e nunca serão compartilhados sem o seu consentimento.'
                  : 'We need your information to contact you about appointments, send examination results, and ensure your therapist has all the data needed for the best care. Your data is protected and will never be shared without your consent.')}
              </p>
            </div>
          </div>

          {/* Language preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <Globe className="h-4 w-4 text-ba1-health" />
              {isPt ? 'Idioma dos Emails' : 'Email Language'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocale('en-GB')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locale === 'en-GB'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">English</p>
                  <p className="text-xs text-muted-foreground">en-GB</p>
                </div>
                {locale === 'en-GB' && (
                  <CheckCircle className="h-4 w-4 text-ba1-health ml-auto" />
                )}
              </button>
              <button
                onClick={() => setLocale('pt-BR')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locale === 'pt-BR'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <span className="text-2xl">🇧🇷</span>
                <div className="text-left">
                  <p className="font-semibold text-foreground text-sm">Português</p>
                  <p className="text-xs text-muted-foreground">pt-BR</p>
                </div>
                {locale === 'pt-BR' && (
                  <CheckCircle className="h-4 w-4 text-ba1-health ml-auto" />
                )}
              </button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {isPt
                ? 'Todos os emails automáticos serão enviados no idioma escolhido.'
                : 'All automated emails (appointments, reminders, results) will be sent in your chosen language.'}
            </p>
          </div>

          {/* Communication Preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-3">
              <MessageCircle className="h-4 w-4 text-ba1-health" />
              {isPt ? 'Canal de Comunicação Preferido' : 'Preferred Communication Channel'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {/* Email — active */}
              <button
                onClick={() => setCommPref('EMAIL')}
                className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                  commPref === 'EMAIL'
                    ? 'border-primary bg-primary/10'
                    : 'border-border hover:border-primary/30'
                }`}
              >
                <Mail className={`h-5 w-5 ${commPref === 'EMAIL' ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className={`text-xs font-semibold ${commPref === 'EMAIL' ? 'text-primary' : 'text-muted-foreground'}`}>Email</span>
              </button>
              {/* SMS — coming soon */}
              <div className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border text-center opacity-50 cursor-not-allowed">
                <div className="absolute -top-2 -right-1 z-10">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-ba1-warn/20 text-ba1-warn text-[9px] font-bold">
                    <Clock className="h-2.5 w-2.5" />
                    {isPt ? 'Em breve' : 'Soon'}
                  </span>
                </div>
                <MessageSquare className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">SMS</span>
              </div>
              {/* WhatsApp — coming soon */}
              <div className="relative flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 border-border text-center opacity-50 cursor-not-allowed">
                <div className="absolute -top-2 -right-1 z-10">
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-ba1-warn/20 text-ba1-warn text-[9px] font-bold">
                    <Clock className="h-2.5 w-2.5" />
                    {isPt ? 'Em breve' : 'Soon'}
                  </span>
                </div>
                <MessageCircle className="h-5 w-5 text-muted-foreground" />
                <span className="text-xs font-semibold text-muted-foreground">WhatsApp</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              {relabel(isPt
                ? 'Lembretes de consulta e atualizações serão enviados por este canal. SMS e WhatsApp serão disponibilizados em breve.'
                : 'Appointment reminders and updates will be sent via this channel. SMS and WhatsApp will be available soon.')}
            </p>
          </div>

          {/* Name — editable on both surfaces. The app's inputs accepted
              typing and dropped it on save because the endpoint refused the
              field; the web had no inputs at all. Correcting your own surname
              is self-service, not a phone call to the clinic. */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                <User className="h-4 w-4 text-ba1-health" />
                {isPt ? 'Nome' : 'First name'}
              </label>
              <input
                type="text"
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
              />
            </div>
            <div>
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
                <User className="h-4 w-4 text-ba1-health" />
                {isPt ? 'Sobrenome' : 'Last name'}
              </label>
              <input
                type="text"
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
              />
            </div>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
              <Calendar className="h-4 w-4 text-ba1-health" />
              {isPt ? 'Data de Nascimento' : 'Date of Birth'}
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              {relabel(isPt
                ? 'Necessária para confirmar a sua identidade e adequar o tratamento à sua faixa etária.'
                : 'Required to confirm your identity and tailor treatment to your age group.')}
            </p>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
              <Phone className="h-4 w-4 text-ba1-health" />
              {T('profile.phone')}
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              {isPt
                ? 'Para que possamos contactá-lo sobre consultas, alterações de horário ou em caso de urgência.'
                : 'So we can contact you about appointments, schedule changes, or in case of urgency.'}
            </p>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+44 7XXX XXXXXX"
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
              <MapPin className="h-4 w-4 text-ba1-health" />
              {T('profile.address')}
            </label>
            <p className="text-[11px] text-muted-foreground mb-2">
              {relabel(isPt
                ? 'Utilizado para referências médicas, correspondência e para auxiliar no planeamento do seu tratamento.'
                : 'Used for medical referrals, correspondence, and to help plan your treatment.')}
            </p>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={isPt ? 'Seu endereço...' : 'Your address...'}
              rows={3}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent resize-none"
            />
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-border pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-foreground mb-1">
              <Shield className="h-4 w-4 text-ba1-bad" />
              {isPt ? 'Contato de Emergência' : 'Emergency Contact'}
            </label>
            <p className="text-[11px] text-muted-foreground mb-3">
              {relabel(isPt
                ? 'Pessoa que devemos contactar em caso de emergência durante o seu tratamento. Esta informação é obrigatória por segurança.'
                : 'Person we should contact in case of emergency during your treatment. This information is required for safety.')}
            </p>
            <div className="space-y-3">
              <input
                type="text"
                value={emergencyName}
                onChange={e => setEmergencyName(e.target.value)}
                placeholder={isPt ? 'Nome completo' : 'Full name'}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder={isPt ? 'Telefone' : 'Phone number'}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                />
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder={isPt ? 'Relação (ex: Cônjuge)' : 'Relationship (e.g. Spouse)'}
                  className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
                />
              </div>
            </div>
          </div>

          {saveError && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-ba1-bad/10 border border-ba1-bad/30">
              <AlertCircle className="h-4 w-4 text-ba1-bad shrink-0 mt-0.5" />
              <p className="text-sm text-ba1-bad">{saveError}</p>
            </div>
          )}

          {/* Save button */}
          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#5dc9c0] to-[#4db8b0] text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity disabled:opacity-60"
          >
            {saving ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
            ) : saved ? (
              <>
                <CheckCircle className="h-4 w-4" />
                {T('profile.saved')}
              </>
            ) : (
              <>
                <Save className="h-4 w-4" />
                {T('profile.save')}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Terms & Consent card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <Link href="/dashboard/consent" className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ba1-health/10 rounded-xl">
              <Scale className="h-5 w-5 text-ba1-health" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{isPt ? 'Termos e Consentimento' : 'Terms & Consent'}</p>
              <p className="text-xs text-muted-foreground">{isPt ? 'Revise os termos de uso e política de privacidade' : 'Review terms of use and privacy policy'}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-muted-foreground" />
        </Link>
      </div>

      {/* Email Change card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <button
          onClick={() => setShowEmailSection(!showEmailSection)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ba1-health/10 rounded-xl">
              <Mail className="h-5 w-5 text-ba1-health" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{isPt ? 'Alterar Email' : 'Change Email'}</p>
              <p className="text-xs text-muted-foreground">{isPt ? 'Atualize seu email de acesso' : 'Update your login email'}</p>
            </div>
          </div>
          <span className={`text-muted-foreground transition-transform ${showEmailSection ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showEmailSection && (
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
            {emailError && (
              <div className="flex items-center gap-2 text-sm text-ba1-bad bg-ba1-bad/10 border border-ba1-bad/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {emailError}
              </div>
            )}
            {emailSuccess && (
              <div className="flex items-center gap-2 text-sm text-ba1-ok bg-ba1-ok/10 border border-ba1-ok/20 rounded-lg p-3">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {emailSuccess}
              </div>
            )}
            <input
              type="email"
              value={newEmail}
              onChange={e => setNewEmail(e.target.value)}
              placeholder={isPt ? 'Novo email' : 'New email address'}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            />
            <input
              type="password"
              value={emailPassword}
              onChange={e => setEmailPassword(e.target.value)}
              placeholder={isPt ? 'Senha atual (pra confirmar)' : 'Current password (to confirm)'}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            />
            <p className="text-xs text-muted-foreground">
              {isPt
                ? 'Vamos enviar um link de confirmação pro email novo — sua conta só muda depois que você clicar nele.'
                : "We'll send a confirmation link to the new address — your account only changes once you click it."}
            </p>
            <button
              onClick={handleEmailChange}
              disabled={emailSaving || !newEmail || !emailPassword}
              className="w-full flex items-center justify-center gap-2 bg-ba1-health hover:bg-ba1-health/90 text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {emailSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Mail className="h-4 w-4" />
                  {isPt ? 'Enviar Confirmação' : 'Send Confirmation'}
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Password Change card */}
      <div className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
        <button
          onClick={() => setShowPwSection(!showPwSection)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-ba1-warn/10 rounded-xl">
              <Lock className="h-5 w-5 text-ba1-warn" />
            </div>
            <div>
              <p className="font-semibold text-foreground">{isPt ? 'Alterar Senha' : 'Change Password'}</p>
              <p className="text-xs text-muted-foreground">{isPt ? 'Atualize sua senha de acesso' : 'Update your login password'}</p>
            </div>
          </div>
          <span className={`text-muted-foreground transition-transform ${showPwSection ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showPwSection && (
          <div className="px-6 pb-6 space-y-4 border-t border-border pt-4">
            {pwError && (
              <div className="flex items-center gap-2 text-sm text-ba1-bad bg-ba1-bad/10 border border-ba1-bad/20 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-center gap-2 text-sm text-ba1-ok bg-ba1-ok/10 border border-ba1-ok/20 rounded-lg p-3">
                <CheckCircle className="h-4 w-4 shrink-0" />
                {isPt ? 'Senha alterada com sucesso!' : 'Password changed successfully!'}
              </div>
            )}
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPw}
                onChange={e => setNewPw(e.target.value)}
                placeholder={isPt ? 'Nova senha (mín. 6 caracteres)' : 'New password (min. 6 characters)'}
                className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent pr-10"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder={isPt ? 'Confirmar nova senha' : 'Confirm new password'}
              className="w-full px-4 py-3 border border-border rounded-xl text-sm bg-card focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-transparent"
            />
            {newPw && confirmPw && newPw === confirmPw && (
              <p className="text-xs text-ba1-ok flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {isPt ? 'Senhas coincidem' : 'Passwords match'}</p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={pwSaving || !newPw || !confirmPw}
              className="w-full flex items-center justify-center gap-2 bg-ba1-warn hover:bg-ba1-warn/90 text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
            >
              {pwSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <>
                  <Lock className="h-4 w-4" />
                  {isPt ? 'Alterar Senha' : 'Change Password'}
                </>
              )}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
