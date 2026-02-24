'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { User, Globe, Phone, MapPin, Save, CheckCircle, Calendar, Shield, Lock, Eye, EyeOff, AlertCircle, Mail, MessageSquare, MessageCircle, Scale, ArrowRight } from 'lucide-react';
import { useLocale } from '@/hooks/use-locale';
import { t as i18nT } from '@/lib/i18n';

export default function PatientProfilePage() {
  const { locale: siteLocale } = useLocale();
  const isPt = siteLocale === 'pt-BR';
  const T = (key: string) => i18nT(key, siteLocale);
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRelation, setEmergencyRelation] = useState('');
  const [locale, setLocale] = useState('en-GB');
  const [commPref, setCommPref] = useState('EMAIL');

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

  useEffect(() => {
    fetch('/api/patient/profile')
      .then(r => r.json())
      .then(d => {
        setProfile(d.user);
        setPhone(d.user?.phone || '');
        setAddress(d.user?.address || '');
        setDateOfBirth(d.user?.dateOfBirth ? d.user.dateOfBirth.split('T')[0] : '');
        setEmergencyName(d.user?.emergencyContactName || '');
        setEmergencyPhone(d.user?.emergencyContactPhone || '');
        setEmergencyRelation(d.user?.emergencyContactRelation || '');
        setLocale(d.user?.preferredLocale || 'en-GB');
        setCommPref(d.user?.communicationPreference || 'EMAIL');
      })
      .finally(() => setLoading(false));
  }, []);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch('/api/patient/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
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
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      }
    } finally {
      setSaving(false);
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="p-2 bg-teal-50 rounded-xl">
          <User className="h-6 w-6 text-teal-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-800">{T('profile.title')}</h1>
          <p className="text-sm text-gray-500">{T('profile.subtitle')}</p>
        </div>
      </div>

      {/* Main profile card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        {/* Header info (read-only) */}
        <div className="bg-gradient-to-r from-[#607d7d] to-[#5dc9c0] px-6 py-5">
          <p className="text-white font-semibold text-lg">
            {profile?.firstName} {profile?.lastName}
          </p>
          <p className="text-teal-100 text-sm">{profile?.email}</p>
        </div>

        <div className="p-6 space-y-6">
          {/* Language preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Globe className="h-4 w-4 text-teal-500" />
              {isPt ? 'Idioma dos Emails' : 'Email Language'}
            </label>
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setLocale('en-GB')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locale === 'en-GB'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🇬🇧</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">English</p>
                  <p className="text-xs text-gray-500">en-GB</p>
                </div>
                {locale === 'en-GB' && (
                  <CheckCircle className="h-4 w-4 text-teal-500 ml-auto" />
                )}
              </button>
              <button
                onClick={() => setLocale('pt-BR')}
                className={`flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                  locale === 'pt-BR'
                    ? 'border-teal-500 bg-teal-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <span className="text-2xl">🇧🇷</span>
                <div className="text-left">
                  <p className="font-semibold text-gray-800 text-sm">Português</p>
                  <p className="text-xs text-gray-500">pt-BR</p>
                </div>
                {locale === 'pt-BR' && (
                  <CheckCircle className="h-4 w-4 text-teal-500 ml-auto" />
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {isPt
                ? 'Todos os emails automáticos serão enviados no idioma escolhido.'
                : 'All automated emails (appointments, reminders, results) will be sent in your chosen language.'}
            </p>
          </div>

          {/* Communication Preference */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <MessageCircle className="h-4 w-4 text-teal-500" />
              {isPt ? 'Canal de Comunicação Preferido' : 'Preferred Communication Channel'}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'EMAIL', icon: Mail, label: 'Email', desc: isPt ? 'Receber por email' : 'Receive by email' },
                { key: 'SMS', icon: MessageSquare, label: 'SMS', desc: isPt ? 'Receber por SMS' : 'Receive by SMS' },
                { key: 'WHATSAPP', icon: MessageCircle, label: 'WhatsApp', desc: isPt ? 'Receber por WhatsApp' : 'Receive via WhatsApp' },
              ].map((ch) => (
                <button
                  key={ch.key}
                  onClick={() => setCommPref(ch.key)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all text-center ${
                    commPref === ch.key
                      ? 'border-teal-500 bg-teal-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                >
                  <ch.icon className={`h-5 w-5 ${commPref === ch.key ? 'text-teal-600' : 'text-gray-400'}`} />
                  <span className={`text-xs font-semibold ${commPref === ch.key ? 'text-teal-700' : 'text-gray-600'}`}>{ch.label}</span>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              {isPt
                ? 'Lembretes de consulta e atualizações serão enviados por este canal.'
                : 'Appointment reminders and updates will be sent via this channel.'}
            </p>
          </div>

          {/* Date of Birth */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Calendar className="h-4 w-4 text-teal-500" />
              {isPt ? 'Data de Nascimento' : 'Date of Birth'}
            </label>
            <input
              type="date"
              value={dateOfBirth}
              onChange={e => setDateOfBirth(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Phone */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <Phone className="h-4 w-4 text-teal-500" />
              {T('profile.phone')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder="+44 7XXX XXXXXX"
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
          </div>

          {/* Address */}
          <div>
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
              <MapPin className="h-4 w-4 text-teal-500" />
              {T('profile.address')}
            </label>
            <textarea
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder={isPt ? 'Seu endereço...' : 'Your address...'}
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent resize-none"
            />
          </div>

          {/* Emergency Contact */}
          <div className="border-t border-gray-100 pt-6">
            <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-3">
              <Shield className="h-4 w-4 text-red-500" />
              {isPt ? 'Contato de Emergência' : 'Emergency Contact'}
            </label>
            <div className="space-y-3">
              <input
                type="text"
                value={emergencyName}
                onChange={e => setEmergencyName(e.target.value)}
                placeholder={isPt ? 'Nome completo' : 'Full name'}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
              />
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="tel"
                  value={emergencyPhone}
                  onChange={e => setEmergencyPhone(e.target.value)}
                  placeholder={isPt ? 'Telefone' : 'Phone number'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
                <input
                  type="text"
                  value={emergencyRelation}
                  onChange={e => setEmergencyRelation(e.target.value)}
                  placeholder={isPt ? 'Relação (ex: Cônjuge)' : 'Relationship (e.g. Spouse)'}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
                />
              </div>
            </div>
          </div>

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
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <Link href="/dashboard/consent" className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-50 rounded-xl">
              <Scale className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{isPt ? 'Termos e Consentimento' : 'Terms & Consent'}</p>
              <p className="text-xs text-gray-500">{isPt ? 'Revise os termos de uso e política de privacidade' : 'Review terms of use and privacy policy'}</p>
            </div>
          </div>
          <ArrowRight className="h-4 w-4 text-gray-400" />
        </Link>
      </div>

      {/* Password Change card */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <button
          onClick={() => setShowPwSection(!showPwSection)}
          className="w-full flex items-center justify-between p-6 text-left hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-50 rounded-xl">
              <Lock className="h-5 w-5 text-amber-600" />
            </div>
            <div>
              <p className="font-semibold text-gray-800">{isPt ? 'Alterar Senha' : 'Change Password'}</p>
              <p className="text-xs text-gray-500">{isPt ? 'Atualize sua senha de acesso' : 'Update your login password'}</p>
            </div>
          </div>
          <span className={`text-gray-400 transition-transform ${showPwSection ? 'rotate-180' : ''}`}>▼</span>
        </button>

        {showPwSection && (
          <div className="px-6 pb-6 space-y-4 border-t border-gray-100 pt-4">
            {pwError && (
              <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg p-3">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {pwError}
              </div>
            )}
            {pwSuccess && (
              <div className="flex items-center gap-2 text-sm text-emerald-600 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
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
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent pr-10"
              />
              <button type="button" onClick={() => setShowNewPw(!showNewPw)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                {showNewPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            <input
              type="password"
              value={confirmPw}
              onChange={e => setConfirmPw(e.target.value)}
              placeholder={isPt ? 'Confirmar nova senha' : 'Confirm new password'}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 focus:border-transparent"
            />
            {newPw && confirmPw && newPw === confirmPw && (
              <p className="text-xs text-emerald-600 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> {isPt ? 'Senhas coincidem' : 'Passwords match'}</p>
            )}
            <button
              onClick={handlePasswordChange}
              disabled={pwSaving || !newPw || !confirmPw}
              className="w-full flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-600 text-white py-3 px-6 rounded-xl font-semibold text-sm transition-colors disabled:opacity-60"
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
