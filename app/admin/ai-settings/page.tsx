"use client";

import { useState, useEffect, useCallback } from "react";
import {
  Settings,
  Key,
  Eye,
  EyeOff,
  Save,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Plus,
  Trash2,
  X,
  Shield,
  Brain,
  Mail,
  Plug,
  ToggleLeft,
  ToggleRight,
  ExternalLink,
} from "lucide-react";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface ConfigEntry {
  id: string;
  key: string;
  label: string;
  description: string | null;
  category: string;
  isSecret: boolean;
  isActive: boolean;
  hasValue: boolean;
  maskedValue: string;
  updatedAt: string;
  updatedBy: string | null;
}

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  ai: { label: "Artificial Intelligence", icon: Brain, color: "text-purple-600" },
  email: { label: "Email Service", icon: Mail, color: "text-blue-600" },
  integration: { label: "Integrations", icon: Plug, color: "text-orange-600" },
  other: { label: "Other", icon: Settings, color: "text-gray-600" },
};

const HELP_LINKS: Record<string, string> = {
  GEMINI_API_KEY: "https://aistudio.google.com/apikey",
  OPENAI_API_KEY: "https://platform.openai.com/api-keys",
  RESEND_API_KEY: "https://resend.com/api-keys",
  FACEBOOK_APP_ID: "https://developers.facebook.com/apps",
  FACEBOOK_APP_SECRET: "https://developers.facebook.com/apps",
  AWS_ACCESS_KEY_ID: "https://console.aws.amazon.com/iam",
  AWS_SECRET_ACCESS_KEY: "https://console.aws.amazon.com/iam",
};

export default function AISettingsPage() {
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [configs, setConfigs] = useState<ConfigEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [showValue, setShowValue] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [showAddForm, setShowAddForm] = useState(false);

  const fetchConfigs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/ai-settings");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setConfigs(data.configs || []);
    } catch (err: any) {
      setError(err.message || "Failed to load settings");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchConfigs();
  }, [fetchConfigs]);

  const handleSave = async (config: ConfigEntry) => {
    if (!editValue.trim()) return;
    setSaving(config.id);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, value: editValue, isActive: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setEditingId(null);
      setEditValue("");
      setSuccess(config.id);
      setTimeout(() => setSuccess(null), 3000);
      fetchConfigs();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(null);
    }
  };

  const handleToggle = async (config: ConfigEntry) => {
    try {
      await fetch("/api/admin/ai-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: config.id, isActive: !config.isActive }),
      });
      fetchConfigs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async (config: ConfigEntry) => {
    if (!confirm(`Delete "${config.label}"? This cannot be undone.`)) return;
    try {
      const res = await fetch(`/api/admin/ai-settings?id=${config.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      fetchConfigs();
    } catch (err: any) {
      setError(err.message);
    }
  };

  // Group by category
  const grouped: Record<string, ConfigEntry[]> = {};
  configs.forEach((c) => {
    if (!grouped[c.category]) grouped[c.category] = [];
    grouped[c.category].push(c);
  });

  const categoryOrder = ["ai", "email", "integration", "other"];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="h-5 w-5 animate-spin text-primary" />
        <span className="ml-2 text-sm text-muted-foreground">Loading settings...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            {T("admin.aiSettingsTitle")}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Configure API keys for AI services, email, and integrations. Keys are encrypted and stored securely.
          </p>
        </div>
        <Button onClick={() => setShowAddForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Key
        </Button>
      </div>

      {error && (
        <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="h-4 w-4 shrink-0" /> {error}
          <Button variant="ghost" size="sm" className="ml-auto h-6 w-6 p-0" onClick={() => setError("")}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* Status Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Key className="h-6 w-6 mx-auto text-primary mb-1" />
            <p className="text-2xl font-bold">{configs.length}</p>
            <p className="text-xs text-muted-foreground">Total Keys</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <CheckCircle2 className="h-6 w-6 mx-auto text-green-500 mb-1" />
            <p className="text-2xl font-bold">{configs.filter((c) => c.isActive && c.hasValue).length}</p>
            <p className="text-xs text-muted-foreground">Active</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <AlertCircle className="h-6 w-6 mx-auto text-amber-500 mb-1" />
            <p className="text-2xl font-bold">{configs.filter((c) => !c.hasValue).length}</p>
            <p className="text-xs text-muted-foreground">Not Configured</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3 text-center">
            <Shield className="h-6 w-6 mx-auto text-blue-500 mb-1" />
            <p className="text-2xl font-bold">{configs.filter((c) => c.isSecret).length}</p>
            <p className="text-xs text-muted-foreground">Encrypted</p>
          </CardContent>
        </Card>
      </div>

      {/* Config Groups */}
      {categoryOrder.map((cat) => {
        const items = grouped[cat];
        if (!items || items.length === 0) return null;
        const meta = CATEGORY_META[cat] || CATEGORY_META.other;
        const Icon = meta.icon;

        return (
          <Card key={cat}>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-base">
                <Icon className={`h-5 w-5 ${meta.color}`} />
                {meta.label}
                <Badge variant="outline" className="text-[10px] ml-1">{items.length}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 pt-0">
              {items.map((config) => (
                <ConfigRow
                  key={config.id}
                  config={config}
                  isEditing={editingId === config.id}
                  editValue={editingId === config.id ? editValue : ""}
                  isSaving={saving === config.id}
                  isSuccess={success === config.id}
                  showSecret={showValue[config.id] || false}
                  onEdit={() => {
                    setEditingId(config.id);
                    setEditValue("");
                  }}
                  onCancel={() => {
                    setEditingId(null);
                    setEditValue("");
                  }}
                  onSave={() => handleSave(config)}
                  onToggle={() => handleToggle(config)}
                  onDelete={() => handleDelete(config)}
                  onValueChange={setEditValue}
                  onToggleShow={() =>
                    setShowValue((prev) => ({ ...prev, [config.id]: !prev[config.id] }))
                  }
                />
              ))}
            </CardContent>
          </Card>
        );
      })}

      {/* Add Custom Key Modal */}
      {showAddForm && (
        <AddConfigModal
          onClose={() => setShowAddForm(false)}
          onSaved={() => {
            setShowAddForm(false);
            fetchConfigs();
          }}
        />
      )}
    </div>
  );
}

// ─── Config Row ────────────────────────────────────────

function ConfigRow({
  config,
  isEditing,
  editValue,
  isSaving,
  isSuccess,
  showSecret,
  onEdit,
  onCancel,
  onSave,
  onToggle,
  onDelete,
  onValueChange,
  onToggleShow,
}: {
  config: ConfigEntry;
  isEditing: boolean;
  editValue: string;
  isSaving: boolean;
  isSuccess: boolean;
  showSecret: boolean;
  onEdit: () => void;
  onCancel: () => void;
  onSave: () => void;
  onToggle: () => void;
  onDelete: () => void;
  onValueChange: (v: string) => void;
  onToggleShow: () => void;
}) {
  const helpLink = HELP_LINKS[config.key];

  return (
    <div className="flex items-start gap-4 py-3 px-3 rounded-lg hover:bg-muted/30 transition-colors border-b last:border-0">
      {/* Toggle */}
      <button onClick={onToggle} className="mt-1 shrink-0" title={config.isActive ? "Enabled" : "Disabled"}>
        {config.isActive && config.hasValue ? (
          <ToggleRight className="h-5 w-5 text-green-500" />
        ) : (
          <ToggleLeft className="h-5 w-5 text-muted-foreground" />
        )}
      </button>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="font-medium text-sm">{config.label}</span>
          <code className="text-[10px] bg-muted px-1.5 py-0.5 rounded font-mono">{config.key}</code>
          {config.isSecret && (
            <Badge variant="outline" className="text-[10px] px-1 py-0 gap-0.5">
              <Shield className="h-2.5 w-2.5" /> Encrypted
            </Badge>
          )}
          {config.hasValue && config.isActive && (
            <Badge className="bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300 text-[10px] px-1.5 py-0">
              Active
            </Badge>
          )}
          {!config.hasValue && (
            <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300 text-[10px] px-1.5 py-0">
              Not set
            </Badge>
          )}
          {isSuccess && (
            <span className="text-green-600 text-xs flex items-center gap-0.5">
              <CheckCircle2 className="h-3 w-3" /> Saved!
            </span>
          )}
        </div>

        {config.description && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">{config.description}</p>
        )}

        {/* Current value (masked) */}
        {config.hasValue && !isEditing && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
              {config.isSecret
                ? showSecret
                  ? config.maskedValue
                  : "••••••••••••"
                : config.maskedValue}
            </code>
            {config.isSecret && (
              <button onClick={onToggleShow} className="text-muted-foreground hover:text-foreground">
                {showSecret ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
              </button>
            )}
          </div>
        )}

        {/* Edit mode */}
        {isEditing && (
          <div className="flex items-center gap-2 mt-2">
            <Input
              type={config.isSecret ? "password" : "text"}
              value={editValue}
              onChange={(e) => onValueChange(e.target.value)}
              placeholder={`Enter ${config.label}...`}
              className="flex-1 h-8 text-sm font-mono"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") onSave();
                if (e.key === "Escape") onCancel();
              }}
            />
            <Button size="sm" className="h-8" onClick={onSave} disabled={isSaving || !editValue.trim()}>
              {isSaving ? <RefreshCw className="h-3 w-3 animate-spin" /> : <Save className="h-3 w-3" />}
            </Button>
            <Button variant="ghost" size="sm" className="h-8" onClick={onCancel}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {helpLink && (
          <a href={helpLink} target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="sm" className="h-7 w-7 p-0" title="Get API Key">
              <ExternalLink className="h-3.5 w-3.5 text-muted-foreground" />
            </Button>
          </a>
        )}
        {!isEditing && (
          <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={onEdit}>
            <Key className="h-3 w-3 mr-1" />
            {config.hasValue ? "Update" : "Set Key"}
          </Button>
        )}
        {!HELP_LINKS[config.key] && (
          <Button
            variant="ghost"
            size="sm"
            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

// ─── Add Config Modal ──────────────────────────────────

function AddConfigModal({
  onClose,
  onSaved,
}: {
  onClose: () => void;
  onSaved: () => void;
}) {
  const [key, setKey] = useState("");
  const [label, setLabel] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("other");
  const [isSecret, setIsSecret] = useState(true);
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSave = async () => {
    if (!key.trim() || !label.trim()) {
      setError("Key and label are required");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/admin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          key: key.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_"),
          value: value.trim(),
          label: label.trim(),
          description: description.trim() || null,
          category,
          isSecret,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      onSaved();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center pt-20 overflow-y-auto">
      <div className="bg-background rounded-xl shadow-xl w-full max-w-md mx-4 mb-10">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-lg font-semibold">Add Custom API Key</h2>
          <Button variant="ghost" size="sm" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-5 space-y-4">
          {error && (
            <div className="bg-destructive/10 text-destructive text-sm p-3 rounded-lg flex items-center gap-2">
              <AlertCircle className="h-4 w-4" /> {error}
            </div>
          )}

          <div className="space-y-1">
            <Label>Key Name *</Label>
            <Input
              value={key}
              onChange={(e) => setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9_]/g, "_"))}
              placeholder="e.g. MY_CUSTOM_API_KEY"
              className="font-mono"
            />
            <p className="text-[11px] text-muted-foreground">Uppercase with underscores only</p>
          </div>

          <div className="space-y-1">
            <Label>Label *</Label>
            <Input
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              placeholder="e.g. My Custom Service"
            />
          </div>

          <div className="space-y-1">
            <Label>Description</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this key used for?"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ai">AI Service</SelectItem>
                  <SelectItem value="email">Email</SelectItem>
                  <SelectItem value="integration">Integration</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Secret?</Label>
              <div className="flex items-center gap-2 h-10">
                <button onClick={() => setIsSecret(!isSecret)}>
                  {isSecret ? (
                    <ToggleRight className="h-6 w-6 text-green-500" />
                  ) : (
                    <ToggleLeft className="h-6 w-6 text-muted-foreground" />
                  )}
                </button>
                <span className="text-sm">{isSecret ? "Encrypted" : "Plain text"}</span>
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <Label>Value (optional — can set later)</Label>
            <Input
              type={isSecret ? "password" : "text"}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="Enter API key value..."
              className="font-mono"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 p-5 border-t">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Plus className="h-4 w-4 mr-2" />}
            Add Configuration
          </Button>
        </div>
      </div>
    </div>
  );
}
