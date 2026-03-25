"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User, Mail, Phone, MapPin, Calendar, Lock, Eye, EyeOff, CheckCircle,
  AlertCircle, Loader2, Globe, Shield, ArrowRight, ArrowLeft,
} from "lucide-react";

export default function IntakePage() {
  const { token } = useParams<{ token: string }>();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expired, setExpired] = useState(false);
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [step, setStep] = useState(1); // 1=personal, 2=security, 3=consent

  // Patient data
  const [clinicName, setClinicName] = useState("BPR Clinic");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [dateOfBirth, setDateOfBirth] = useState("");
  const [address, setAddress] = useState("");
  const [locale, setLocale] = useState("en-GB");
  const [emergencyName, setEmergencyName] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [emergencyRelation, setEmergencyRelation] = useState("");

  // Security
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Consent
  const [consentAccepted, setConsentAccepted] = useState(false);
  const [alreadyAccepted, setAlreadyAccepted] = useState(false);
  const [acceptConsent, setAcceptConsent] = useState(false);

  const isPt = locale === "pt-BR";

  useEffect(() => {
    fetch(`/api/intake/${token}`)
      .then(async (res) => {
        if (!res.ok) {
          const d = await res.json();
          if (res.status === 410) setExpired(true);
          throw new Error(d.error || "Invalid link");
        }
        return res.json();
      })
      .then((d) => {
        setFirstName(d.firstName || "");
        setLastName(d.lastName || "");
        setEmail(d.email || "");
        setPhone(d.phone || "");
        setDateOfBirth(d.dateOfBirth || "");
        setAddress(d.address || "");
        setLocale(d.preferredLocale || "en-GB");
        setClinicName(d.clinicName || "BPR Clinic");
        setAlreadyAccepted(d.consentAccepted);
        if (d.profileCompleted) setDone(true);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSubmit = async () => {
    // Validation
    if (!firstName.trim() || !lastName.trim() || !email.trim()) {
      setError(isPt ? "Nome, sobrenome e email são obrigatórios." : "First name, last name, and email are required.");
      return;
    }
    if (password && password.length < 8) {
      setError(isPt ? "A senha deve ter no mínimo 8 caracteres." : "Password must be at least 8 characters.");
      return;
    }
    if (password && password !== confirmPassword) {
      setError(isPt ? "As senhas não coincidem." : "Passwords do not match.");
      return;
    }

    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/intake/${token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          dateOfBirth: dateOfBirth || null,
          address: address.trim(),
          password: password || undefined,
          preferredLocale: locale,
          acceptConsent: acceptConsent,
          emergencyContactName: emergencyName.trim() || undefined,
          emergencyContactPhone: emergencyPhone.trim() || undefined,
          emergencyContactRelation: emergencyRelation.trim() || undefined,
        }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);
      setDone(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-teal-500" />
      </div>
    );
  }

  if (expired) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-800">
            {isPt ? "Link Expirado" : "Link Expired"}
          </h1>
          <p className="text-gray-600 text-sm">
            {isPt
              ? "Este link de convite expirou. Por favor, entre em contato com a clínica para um novo link."
              : "This invite link has expired. Please contact the clinic for a new one."}
          </p>
        </div>
      </div>
    );
  }

  if (error && !firstName) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-red-50 via-white to-orange-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border p-8 max-w-md w-full text-center space-y-4">
          <AlertCircle className="h-12 w-12 text-red-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-800">
            {isPt ? "Link Inválido" : "Invalid Link"}
          </h1>
          <p className="text-gray-600 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (done) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-lg border p-8 max-w-md w-full text-center space-y-4">
          <CheckCircle className="h-12 w-12 text-teal-500 mx-auto" />
          <h1 className="text-xl font-bold text-gray-800">
            {isPt ? "Perfil Completo!" : "Profile Complete!"}
          </h1>
          <p className="text-gray-600 text-sm">
            {isPt
              ? "Seus dados foram salvos com sucesso. Agora você pode acessar o portal do paciente."
              : "Your information has been saved successfully. You can now access the patient portal."}
          </p>
          <button
            onClick={() => router.push("/login")}
            className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {isPt ? "Acessar Portal" : "Go to Login"} →
          </button>
        </div>
      </div>
    );
  }

  const totalSteps = alreadyAccepted ? 2 : 3;

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-blue-50 py-8 px-4">
      <div className="max-w-lg mx-auto space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg">
            <User className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800">
            {isPt ? `Bem-vindo(a), ${firstName}!` : `Welcome, ${firstName}!`}
          </h1>
          <p className="text-sm text-gray-500">
            {isPt
              ? `${clinicName} convida você a completar seu perfil para acesso ao portal do paciente.`
              : `${clinicName} invites you to complete your profile for patient portal access.`}
          </p>
        </div>

        {/* Progress */}
        <div className="flex items-center justify-center gap-2">
          {Array.from({ length: totalSteps }, (_, i) => (
            <div
              key={i}
              className={`h-2 rounded-full transition-all ${
                i + 1 <= step ? "bg-teal-500 w-12" : "bg-gray-200 w-8"
              }`}
            />
          ))}
          <span className="text-xs text-gray-400 ml-2">
            {step}/{totalSteps}
          </span>
        </div>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-xl flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            {error}
          </div>
        )}

        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-teal-600 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <User className="h-5 w-5" />
                {isPt ? "Informações Pessoais" : "Personal Information"}
              </h2>
              <p className="text-teal-100 text-xs mt-1">
                {isPt ? "Revise e atualize seus dados" : "Review and update your details"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              {/* Language */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Globe className="h-4 w-4 text-teal-500" />
                  {isPt ? "Idioma" : "Language"}
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setLocale("en-GB")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm ${
                      locale === "en-GB" ? "border-teal-500 bg-teal-50" : "border-gray-200"
                    }`}
                  >
                    <span>🇬🇧</span> English
                    {locale === "en-GB" && <CheckCircle className="h-4 w-4 text-teal-500 ml-auto" />}
                  </button>
                  <button
                    onClick={() => setLocale("pt-BR")}
                    className={`flex items-center gap-2 p-3 rounded-xl border-2 transition-all text-sm ${
                      locale === "pt-BR" ? "border-teal-500 bg-teal-50" : "border-gray-200"
                    }`}
                  >
                    <span>🇧🇷</span> Português
                    {locale === "pt-BR" && <CheckCircle className="h-4 w-4 text-teal-500 ml-auto" />}
                  </button>
                </div>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    {isPt ? "Nome *" : "First Name *"}
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
                <div>
                  <label className="text-sm font-semibold text-gray-700 mb-1 block">
                    {isPt ? "Sobrenome *" : "Last Name *"}
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <Mail className="h-4 w-4 text-teal-500" /> Email *
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Phone */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <Phone className="h-4 w-4 text-teal-500" /> {isPt ? "Telefone" : "Phone"}
                </label>
                <input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+44 7XXX XXXXXX"
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* DOB */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <Calendar className="h-4 w-4 text-teal-500" /> {isPt ? "Data de Nascimento" : "Date of Birth"}
                </label>
                <input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                />
              </div>

              {/* Address */}
              <div>
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <MapPin className="h-4 w-4 text-teal-500" /> {isPt ? "Endereço" : "Address"}
                </label>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 resize-none"
                />
              </div>

              {/* Emergency Contact */}
              <div className="border-t pt-4">
                <label className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-2">
                  <Shield className="h-4 w-4 text-red-500" /> {isPt ? "Contato de Emergência" : "Emergency Contact"}
                </label>
                <div className="space-y-2">
                  <input
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder={isPt ? "Nome completo" : "Full name"}
                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="tel"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      placeholder={isPt ? "Telefone" : "Phone"}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                    <input
                      type="text"
                      value={emergencyRelation}
                      onChange={(e) => setEmergencyRelation(e.target.value)}
                      placeholder={isPt ? "Relação" : "Relationship"}
                      className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={() => {
                  setError("");
                  if (!firstName.trim() || !lastName.trim() || !email.trim()) {
                    setError(isPt ? "Nome, sobrenome e email são obrigatórios." : "First name, last name, and email are required.");
                    return;
                  }
                  setStep(2);
                }}
                className="w-full bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
              >
                {isPt ? "Próximo" : "Next"} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Password */}
        {step === 2 && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-amber-500 to-amber-600 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Lock className="h-5 w-5" />
                {isPt ? "Segurança" : "Security"}
              </h2>
              <p className="text-amber-100 text-xs mt-1">
                {isPt ? "Defina ou atualize sua senha de acesso" : "Set or update your login password"}
              </p>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                {isPt
                  ? "Crie uma senha segura para acessar o portal. Mínimo 8 caracteres."
                  : "Create a secure password to access the portal. Minimum 8 characters."}
              </p>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder={isPt ? "Nova senha" : "New password"}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder={isPt ? "Confirmar senha" : "Confirm password"}
                className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-teal-400"
              />
              {password && confirmPassword && password === confirmPassword && (
                <p className="text-xs text-emerald-600 flex items-center gap-1">
                  <CheckCircle className="h-3 w-3" /> {isPt ? "Senhas coincidem" : "Passwords match"}
                </p>
              )}
              <p className="text-xs text-gray-400">
                {isPt
                  ? "Se não deseja alterar a senha, deixe os campos em branco."
                  : "Leave blank if you don't want to change your password."}
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
                </button>
                {alreadyAccepted ? (
                  <button
                    onClick={handleSubmit}
                    disabled={saving}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                    {isPt ? "Salvar" : "Save"}
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(3)}
                    className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
                  >
                    {isPt ? "Próximo" : "Next"} <ArrowRight className="h-4 w-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Step 3: Consent (only if not already accepted) */}
        {step === 3 && !alreadyAccepted && (
          <div className="bg-white rounded-2xl shadow-sm border overflow-hidden">
            <div className="bg-gradient-to-r from-blue-500 to-blue-600 px-6 py-4">
              <h2 className="text-white font-semibold flex items-center gap-2">
                <Shield className="h-5 w-5" />
                {isPt ? "Termos e Consentimento" : "Terms & Consent"}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div className="bg-gray-50 rounded-xl p-4 text-sm text-gray-600 max-h-48 overflow-y-auto space-y-3">
                <p>
                  {isPt
                    ? "Ao utilizar os serviços da clínica, você concorda com o processamento dos seus dados pessoais e clínicos para fins de tratamento e acompanhamento."
                    : "By using the clinic's services, you agree to the processing of your personal and clinical data for treatment and follow-up purposes."}
                </p>
                <p>
                  {isPt
                    ? "Seus dados serão tratados com confidencialidade e de acordo com a legislação de proteção de dados aplicável (GDPR/LGPD)."
                    : "Your data will be treated confidentially and in accordance with applicable data protection legislation (GDPR/LGPD)."}
                </p>
                <p>
                  {isPt
                    ? "Você pode solicitar acesso, correção ou exclusão dos seus dados a qualquer momento entrando em contato com a clínica."
                    : "You may request access, correction, or deletion of your data at any time by contacting the clinic."}
                </p>
              </div>

              <label className="flex items-start gap-3 p-3 rounded-xl border-2 border-gray-200 hover:border-teal-300 transition-colors cursor-pointer">
                <input
                  type="checkbox"
                  checked={acceptConsent}
                  onChange={(e) => setAcceptConsent(e.target.checked)}
                  className="mt-1 rounded border-gray-300 text-teal-500 focus:ring-teal-500"
                />
                <span className="text-sm text-gray-700">
                  {isPt
                    ? "Li e aceito os termos de uso, política de privacidade e consentimento informado."
                    : "I have read and accept the terms of use, privacy policy, and informed consent."}
                </span>
              </label>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(2)}
                  className="flex-1 bg-gray-100 text-gray-700 py-3 px-6 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                >
                  <ArrowLeft className="h-4 w-4" /> {isPt ? "Voltar" : "Back"}
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={saving || !acceptConsent}
                  className="flex-1 bg-gradient-to-r from-teal-500 to-teal-600 text-white py-3 px-6 rounded-xl font-semibold text-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-60"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                  {isPt ? "Concluir" : "Complete"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
