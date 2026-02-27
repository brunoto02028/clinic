"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { ImageGalleryPicker } from "@/components/ui/image-gallery-picker";
import {
  Loader2, Upload, X, Plus, Trash2, Save, Sparkles, Eye, Edit, ExternalLink, Globe, ArrowLeft,
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useLocale } from "@/hooks/use-locale";
import { t as i18nT } from "@/lib/i18n";
import { AIFieldHelper } from "@/components/admin/ai-field-helper";
import { AIImageGenerator } from "@/components/admin/ai-image-generator";
// Using native <img> for user-uploaded images (Next.js Image optimization can't access Nginx-served uploads)

const SERVICE_ICON_MAP: Record<string, any> = {
  Zap, Dumbbell, Footprints, ScanLine, Waves, CircleDot, Activity, Heart,
  Syringe, Users, Brain, Flame, Shield, Target, Stethoscope, HeartPulse, Bone,
};

interface Service {
  id: string;
  title: string;
  description: string;
  icon?: string;
  imageUrl?: string;
}

interface PortalFeature {
  id: string;
  icon: string;
  title: string;
  description: string;
}

interface ContactCard {
  id: string;
  icon: string;
  title: string;
  content: string;
}

interface FooterLink {
  id: string;
  title: string;
  url: string;
}

interface SocialLink {
  id: string;
  platform: string;
  url: string;
}

// Inline articles list for Settings page Articles tab
function ArticlesListInline() {
  const [articles, setArticles] = useState<any[]>([]);
  const [loadingArticles, setLoadingArticles] = useState(true);
  const { toast } = useToast();

  const fetchArticles = async () => {
    try {
      const res = await fetch("/api/articles");
      if (res.ok) {
        const data = await res.json();
        setArticles(data.articles || data || []);
      }
    } catch {} finally { setLoadingArticles(false); }
  };

  useEffect(() => { fetchArticles(); }, []);

  const togglePublish = async (id: string, published: boolean) => {
    try {
      const res = await fetch(`/api/articles/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ published: !published }),
      });
      if (res.ok) {
        toast({ title: !published ? "Published" : "Unpublished" });
        fetchArticles();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  const deleteArticle = async (id: string) => {
    if (!confirm("Delete this article permanently?")) return;
    try {
      const res = await fetch(`/api/articles/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast({ title: "Deleted" });
        fetchArticles();
      }
    } catch {
      toast({ title: "Error", variant: "destructive" });
    }
  };

  if (loadingArticles) return <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin" /></div>;

  if (articles.length === 0) return (
    <div className="text-center py-8 text-muted-foreground">
      <p className="text-sm">No articles yet.</p>
      <Button size="sm" className="mt-2" onClick={() => window.open("/admin/articles/new", "_blank")}>
        <Plus className="h-4 w-4 mr-1" /> Create First Article
      </Button>
    </div>
  );

  return (
    <div className="space-y-2">
      {articles.map((a: any) => (
        <div key={a.id} className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/30 transition-colors">
          {a.imageUrl && (
            <div className="w-16 h-10 rounded overflow-hidden bg-muted flex-shrink-0">
              <img src={a.imageUrl} alt="" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{a.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <Badge variant={a.published ? "default" : "secondary"} className="text-[10px]">
                {a.published ? "Published" : "Draft"}
              </Badge>
              <span className="text-[10px] text-muted-foreground">
                {new Date(a.createdAt).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" })}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => togglePublish(a.id, a.published)} title={a.published ? "Unpublish" : "Publish"}>
              {a.published ? <Eye className="h-3.5 w-3.5 text-emerald-600" /> : <Globe className="h-3.5 w-3.5 text-muted-foreground" />}
            </Button>
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.open(`/admin/articles/${a.id}`, "_blank")} title="Edit">
              <Edit className="h-3.5 w-3.5" />
            </Button>
            {a.published && (
              <Button size="sm" variant="ghost" className="h-8 w-8 p-0" onClick={() => window.open(`/articles/${a.slug}`, "_blank")} title="View on site">
                <ExternalLink className="h-3.5 w-3.5" />
              </Button>
            )}
            <Button size="sm" variant="ghost" className="h-8 w-8 p-0 text-destructive" onClick={() => deleteArticle(a.id)} title="Delete">
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function AdminSettingsPage() {
  const router = useRouter();
  const { locale } = useLocale();
  const T = (key: string) => i18nT(key, locale);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [currentImageField, setCurrentImageField] = useState<string>("");
  const { toast } = useToast();

  // Form state for all blocks
  const [settings, setSettings] = useState({
    // Branding
    siteName: "",
    tagline: "",
    logoUrl: "",
    logoPath: "",
    darkLogoUrl: "",
    darkLogoPath: "",
    faviconUrl: "",

    // Hero Section (Block 2)
    heroTitle: "",
    heroSubtitle: "",
    heroImageUrl: "",
    heroImagePath: "",
    heroCTA: "",
    heroCTALink: "",

    // Portal Section (Block 3)
    portalTitle: "",
    portalSubtitle: "",
    portalText: "",

    // Services Section (Block 4)
    servicesTitle: "",
    servicesSubtitle: "",
    servicesJson: "",

    // About Section (Block 5)
    aboutTitle: "",
    aboutText: "",
    aboutImageUrl: "",
    aboutImagePath: "",

    // Articles Section (Block 6)
    articlesTitle: "",
    articlesSubtitle: "",

    // Articles Placeholder (Block 7)
    articlesPlaceholderTitle: "",
    articlesPlaceholderText: "",

    // Contact Section (Block 8)
    contactTitle: "",
    contactSubtitle: "",
    contactText: "",
    phone: "",
    email: "",
    address: "",
    whatsappNumber: "",
    whatsappEnabled: false,
    whatsappMessage: "",

    // Footer (Block 9)
    footerText: "",
    footerLinksJson: "",
    socialLinksJson: "",
    footerModulesJson: "",

    // Terms of Use
    termsContentHtml: "",

    // Custom Insoles Block (Block 10)
    insolesTitle: "",
    insolesSubtitle: "",
    insolesDesc: "",
    insolesImageUrl: "",
    insolesImagePath: "",
    insolesStepsJson: "",
    insolesBenefitsJson: "",

    // Biomechanical Block (Block 11)
    bioTitle: "",
    bioSubtitle: "",
    bioDesc: "",
    bioImageUrl: "",
    bioImagePath: "",
    bioStepsJson: "",
    bioBenefitsJson: "",

    // Landing Pages
    lpTherapiesJson: "",
    lpInsolesJson: "",
    lpBiomechanicsJson: "",

    // SEO
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    ogImageUrl: "",
    ogImagePath: "",

    // SEO Advanced
    canonicalUrl: "",
    robotsMeta: "",
    googleVerification: "",
    bingVerification: "",
    schemaOrgJson: "",
    geoRegion: "",
    geoPlacename: "",
    geoPosition: "",
    ogType: "",
    ogLocale: "",
    ogSiteName: "",
    twitterCard: "",
    twitterSite: "",
    twitterCreator: "",
    // Google Business Profile
    businessName: "",
    businessType: "",
    businessStreet: "",
    businessCity: "",
    businessRegion: "",
    businessPostcode: "",
    businessCountry: "",
    businessPhone: "",
    businessEmail: "",
    businessHoursJson: "",
    businessPriceRange: "",
    businessCurrency: "",
    sitemapEnabled: true,
    robotsTxtCustom: "",
    socialProfilesJson: "",

    // Portal Features + Contact Cards (JSON)
    portalFeaturesJson: "",
    contactCardsJson: "",

    // MLS Laser
    mlsLaserJson: "",
  });

  const SCREEN_KEYS = [
    { key: 'login', label: 'Patient Login', dark: false },
    { key: 'adminLogin', label: 'Admin Login', dark: true },
    { key: 'signup', label: 'Signup', dark: false },
    { key: 'dashboard', label: 'Patient Dashboard (Sidebar)', dark: false },
    { key: 'landingHeader', label: 'Landing Page (Header)', dark: false },
    { key: 'landingFooter', label: 'Landing Page (Footer)', dark: true },
    { key: 'forgotPassword', label: 'Forgot Password', dark: false },
  ] as const;
  type ScreenLogoEntry = { logoUrl: string; darkLogoUrl: string };
  type ScreenLogos = Record<string, ScreenLogoEntry>;
  const [screenLogos, setScreenLogos] = useState<ScreenLogos>({});
  const [screenLogoPicker, setScreenLogoPicker] = useState<{ screen: string; field: 'logoUrl' | 'darkLogoUrl' } | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [footerLinks, setFooterLinks] = useState<FooterLink[]>([]);
  const [socialLinks, setSocialLinks] = useState<SocialLink[]>([]);
  const [portalFeatures, setPortalFeatures] = useState<PortalFeature[]>([]);
  const [contactCards, setContactCards] = useState<ContactCard[]>([]);

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch("/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings({
          siteName: data.siteName || "",
          tagline: data.tagline || "",
          logoUrl: data.logoUrl || "",
          logoPath: data.logoPath || "",
          darkLogoUrl: data.darkLogoUrl || "",
          darkLogoPath: data.darkLogoPath || "",
          faviconUrl: data.faviconUrl || "",
          heroTitle: data.heroTitle || "",
          heroSubtitle: data.heroSubtitle || "",
          heroImageUrl: data.heroImageUrl || "",
          heroImagePath: data.heroImagePath || "",
          heroCTA: data.heroCTA || "",
          heroCTALink: data.heroCTALink || "",
          portalTitle: data.portalTitle || "",
          portalSubtitle: data.portalSubtitle || "",
          portalText: data.portalText || "",
          servicesTitle: data.servicesTitle || "",
          servicesSubtitle: data.servicesSubtitle || "",
          servicesJson: data.servicesJson || "",
          aboutTitle: data.aboutTitle || "",
          aboutText: data.aboutText || "",
          aboutImageUrl: data.aboutImageUrl || "",
          aboutImagePath: data.aboutImagePath || "",
          articlesTitle: data.articlesTitle || "",
          articlesSubtitle: data.articlesSubtitle || "",
          articlesPlaceholderTitle: data.articlesPlaceholderTitle || "",
          articlesPlaceholderText: data.articlesPlaceholderText || "",
          contactTitle: data.contactTitle || "",
          contactSubtitle: data.contactSubtitle || "",
          contactText: data.contactText || "",
          phone: data.phone || "",
          email: data.email || "",
          address: data.address || "",
          whatsappNumber: data.whatsappNumber || "",
          whatsappEnabled: data.whatsappEnabled ?? false,
          whatsappMessage: data.whatsappMessage || "",
          footerText: data.footerText || "",
          footerLinksJson: data.footerLinksJson || "",
          socialLinksJson: data.socialLinksJson || "",
          footerModulesJson: data.footerModulesJson || "",
          termsContentHtml: data.termsContentHtml || "",
          metaTitle: data.metaTitle || "",
          metaDescription: data.metaDescription || "",
          metaKeywords: data.metaKeywords || "",
          ogImageUrl: data.ogImageUrl || "",
          ogImagePath: data.ogImagePath || "",
          insolesTitle: data.insolesTitle || "",
          insolesSubtitle: data.insolesSubtitle || "",
          insolesDesc: data.insolesDesc || "",
          insolesImageUrl: data.insolesImageUrl || "",
          insolesImagePath: data.insolesImagePath || "",
          insolesStepsJson: data.insolesStepsJson || "",
          insolesBenefitsJson: data.insolesBenefitsJson || "",
          bioTitle: data.bioTitle || "",
          bioSubtitle: data.bioSubtitle || "",
          bioDesc: data.bioDesc || "",
          bioImageUrl: data.bioImageUrl || "",
          bioImagePath: data.bioImagePath || "",
          bioStepsJson: data.bioStepsJson || "",
          bioBenefitsJson: data.bioBenefitsJson || "",
          lpTherapiesJson: data.lpTherapiesJson || "",
          lpInsolesJson: data.lpInsolesJson || "",
          lpBiomechanicsJson: data.lpBiomechanicsJson || "",
          canonicalUrl: data.canonicalUrl || "",
          robotsMeta: data.robotsMeta || "",
          googleVerification: data.googleVerification || "",
          schemaOrgJson: data.schemaOrgJson || "",
          geoRegion: data.geoRegion || "",
          geoPlacename: data.geoPlacename || "",
          geoPosition: data.geoPosition || "",
          ogType: data.ogType || "",
          ogLocale: data.ogLocale || "",
          twitterCard: data.twitterCard || "",
          twitterSite: data.twitterSite || "",
          twitterCreator: data.twitterCreator || "",
          ogSiteName: data.ogSiteName || "",
          bingVerification: data.bingVerification || "",
          businessName: data.businessName || "",
          businessType: data.businessType || "",
          businessStreet: data.businessStreet || "",
          businessCity: data.businessCity || "",
          businessRegion: data.businessRegion || "",
          businessPostcode: data.businessPostcode || "",
          businessCountry: data.businessCountry || "",
          businessPhone: data.businessPhone || "",
          businessEmail: data.businessEmail || "",
          businessHoursJson: data.businessHoursJson || "",
          businessPriceRange: data.businessPriceRange || "",
          businessCurrency: data.businessCurrency || "",
          sitemapEnabled: data.sitemapEnabled ?? true,
          robotsTxtCustom: data.robotsTxtCustom || "",
          socialProfilesJson: data.socialProfilesJson || "",
          portalFeaturesJson: data.portalFeaturesJson || "",
          contactCardsJson: data.contactCardsJson || "",
          mlsLaserJson: data.mlsLaserJson || "",
        });
        // Load per-screen logos
        if (data.screenLogos && typeof data.screenLogos === 'object') {
          setScreenLogos(data.screenLogos as ScreenLogos);
        }

        // Parse JSON fields
        if (data.servicesJson) {
          try {
            setServices(JSON.parse(data.servicesJson));
          } catch (e) {
            console.error("Failed to parse services JSON:", e);
          }
        }
        if (data.footerLinksJson) {
          try {
            setFooterLinks(JSON.parse(data.footerLinksJson));
          } catch (e) {
            console.error("Failed to parse footer links JSON:", e);
          }
        }
        if (data.socialLinksJson) {
          try {
            setSocialLinks(JSON.parse(data.socialLinksJson));
          } catch (e) {
            console.error("Failed to parse social links JSON:", e);
          }
        }
        if (data.portalFeaturesJson) {
          try {
            setPortalFeatures(JSON.parse(data.portalFeaturesJson));
          } catch (e) {
            console.error("Failed to parse portal features JSON:", e);
          }
        } else {
          setPortalFeatures([
            { id: "1", icon: "Calendar", title: "Online Booking", description: "Book your appointment online" },
            { id: "2", icon: "FileText", title: "Digital Records", description: "Access treatment history" },
            { id: "3", icon: "ClipboardCheck", title: "Medical Screening", description: "Complete screening online" },
            { id: "4", icon: "Zap", title: "Advanced Treatments", description: "Cutting-edge therapies" },
          ]);
        }
        if (data.contactCardsJson) {
          try {
            setContactCards(JSON.parse(data.contactCardsJson));
          } catch (e) {
            console.error("Failed to parse contact cards JSON:", e);
          }
        } else {
          setContactCards([
            { id: "1", icon: "MapPin", title: "Location", content: "London: The Vineyard, Richmond TW10 6AQ\nIpswich: Suffolk, IP1" },
            { id: "2", icon: "Clock", title: "Hours", content: "Open every day including weekends" },
          ]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch settings:", error);
      toast({
        title: "Error",
        description: "Failed to load settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const payload = {
        ...settings,
        servicesJson: JSON.stringify(services),
        footerLinksJson: JSON.stringify(footerLinks),
        socialLinksJson: JSON.stringify(socialLinks),
        portalFeaturesJson: JSON.stringify(portalFeatures),
        contactCardsJson: JSON.stringify(contactCards),
        screenLogos: Object.keys(screenLogos).length > 0 ? screenLogos : null,
      };

      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error("Failed to save settings");

      toast({
        title: "Success",
        description: "Settings saved successfully",
      });

      // Update version to trigger auto-refresh
      await fetch("/api/version/update", { method: "POST" });
    } catch (error) {
      console.error("Failed to save settings:", error);
      toast({
        title: "Error",
        description: "Failed to save settings",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const openImagePicker = (fieldName: string) => {
    setCurrentImageField(fieldName);
    setShowImagePicker(true);
  };

  const handleImageSelect = (imageUrl: string, cloud_storage_path: string) => {
    // MLS Laser images are stored inside mlsLaserJson
    if (currentImageField === "__mls_treatment" || currentImageField === "__mls_device") {
      let mls: any = {};
      try { mls = settings.mlsLaserJson ? JSON.parse(settings.mlsLaserJson) : {}; } catch {}
      const key = currentImageField === "__mls_treatment" ? "treatmentImageUrl" : "deviceImageUrl";
      mls[key] = imageUrl;
      setSettings({ ...settings, mlsLaserJson: JSON.stringify(mls) });
      return;
    }
    setSettings({
      ...settings,
      [currentImageField]: imageUrl,
      [`${currentImageField.replace("Url", "Path")}`]: cloud_storage_path,
    });
  };

  const removeImage = (fieldName: string) => {
    setSettings({
      ...settings,
      [fieldName]: "",
      [`${fieldName.replace("Url", "Path")}`]: "",
    });
  };

  // Services management
  const addService = () => {
    setServices([
      ...services,
      { id: Date.now().toString(), title: "", description: "", imageUrl: "" },
    ]);
  };

  const updateService = (id: string, field: string, value: string) => {
    setServices(
      services.map((s) => (s.id === id ? { ...s, [field]: value } : s))
    );
  };

  const removeService = (id: string) => {
    setServices(services.filter((s) => s.id !== id));
  };

  // Footer links management
  const addFooterLink = () => {
    setFooterLinks([
      ...footerLinks,
      { id: Date.now().toString(), title: "", url: "" },
    ]);
  };

  const updateFooterLink = (id: string, field: string, value: string) => {
    setFooterLinks(
      footerLinks.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const removeFooterLink = (id: string) => {
    setFooterLinks(footerLinks.filter((l) => l.id !== id));
  };

  // Portal features management
  const addPortalFeature = () => {
    setPortalFeatures([...portalFeatures, { id: Date.now().toString(), icon: "Star", title: "", description: "" }]);
  };
  const updatePortalFeature = (id: string, field: string, value: string) => {
    setPortalFeatures(portalFeatures.map((f) => (f.id === id ? { ...f, [field]: value } : f)));
  };
  const removePortalFeature = (id: string) => {
    setPortalFeatures(portalFeatures.filter((f) => f.id !== id));
  };

  // Contact cards management
  const addContactCard = () => {
    setContactCards([...contactCards, { id: Date.now().toString(), icon: "Info", title: "", content: "" }]);
  };
  const updateContactCard = (id: string, field: string, value: string) => {
    setContactCards(contactCards.map((c) => (c.id === id ? { ...c, [field]: value } : c)));
  };
  const removeContactCard = (id: string) => {
    setContactCards(contactCards.filter((c) => c.id !== id));
  };

  // Social links management
  const addSocialLink = () => {
    setSocialLinks([
      ...socialLinks,
      { id: Date.now().toString(), platform: "", url: "" },
    ]);
  };

  const updateSocialLink = (id: string, field: string, value: string) => {
    setSocialLinks(
      socialLinks.map((l) => (l.id === id ? { ...l, [field]: value } : l))
    );
  };

  const removeSocialLink = (id: string) => {
    setSocialLinks(socialLinks.filter((l) => l.id !== id));
  };

  // Helper: Label with AI + Voice buttons
  const FieldLabel = ({ htmlFor, fieldName, label, context }: { htmlFor: string; fieldName: string; label: string; context?: string }) => (
    <div className="flex items-center justify-between">
      <Label htmlFor={htmlFor}>{label}</Label>
      <AIFieldHelper
        fieldName={fieldName}
        fieldLabel={label}
        currentValue={settings[fieldName as keyof typeof settings] as string || ""}
        context={context}
        onApply={(text) => setSettings({ ...settings, [fieldName]: text })}
      />
    </div>
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="shrink-0" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{T("admin.siteSettingsTitle")}</h1>
            <p className="text-muted-foreground mt-1">
              {T("admin.siteSettingsDesc")}
            </p>
          </div>
        </div>
        <Button onClick={handleSaveSettings} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save All Changes
            </>
          )}
        </Button>
      </div>

      <Tabs defaultValue="branding" className="space-y-6">
        <TabsList className="flex flex-wrap gap-1 h-auto p-1">
          <TabsTrigger value="branding">Branding</TabsTrigger>
          <TabsTrigger value="hero">Hero</TabsTrigger>
          <TabsTrigger value="portal">Portal</TabsTrigger>
          <TabsTrigger value="services">Services</TabsTrigger>
          <TabsTrigger value="insoles">Insoles</TabsTrigger>
          <TabsTrigger value="biomechanics">Biomechanics</TabsTrigger>
          <TabsTrigger value="mls-laser">MLS Laser</TabsTrigger>
          <TabsTrigger value="about">About</TabsTrigger>
          <TabsTrigger value="articles">Articles</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="footer">Footer</TabsTrigger>
          <TabsTrigger value="terms">Terms of Use</TabsTrigger>
          <TabsTrigger value="seo">SEO</TabsTrigger>
        </TabsList>

        {/* Branding Tab */}
        <TabsContent value="branding" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Header</p>
            </div>
            <CardContent className="p-4">
              <div className="flex items-center justify-between bg-card rounded-lg border p-3 shadow-sm">
                <div className="flex items-center gap-3">
                  {settings.logoUrl ? (
                    <img src={settings.logoUrl} alt="Logo" className="h-10 w-10 rounded object-contain" />
                  ) : (
                    <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">B</div>
                  )}
                  <div>
                    <p className="font-bold text-sm">{settings.siteName || "Bruno Physical Rehabilitation"}</p>
                    <p className="text-[10px] text-muted-foreground">{settings.tagline || "Where Innovation Meets Care"}</p>
                  </div>
                </div>
                <div className="flex gap-2 text-[10px] text-muted-foreground">
                  <span>Services</span><span>About</span><span>Contact</span>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Branding & Logo</CardTitle>
              <CardDescription>
                Configure your site name, tagline, and logo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={settings.siteName}
                  onChange={(e) =>
                    setSettings({ ...settings, siteName: e.target.value })
                  }
                  placeholder="Bruno Physical Rehabilitation"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="tagline">Tagline</Label>
                <Input
                  id="tagline"
                  value={settings.tagline}
                  onChange={(e) =>
                    setSettings({ ...settings, tagline: e.target.value })
                  }
                  placeholder="Your rehabilitation journey starts here"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Logo (Light Background)</Label>
                  <p className="text-xs text-muted-foreground">Used on white/light pages (login, header, sidebar)</p>
                  {settings.logoUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={settings.logoUrl}
                        alt="Logo"
                        style={{ width: 200, height: 80 }}
                        className="object-contain border rounded bg-white p-2"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage("logoUrl")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => openImagePicker("logoUrl")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Logo
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Logo (Dark Background)</Label>
                  <p className="text-xs text-muted-foreground">White/light version for dark pages (admin login, footer)</p>
                  {settings.darkLogoUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={settings.darkLogoUrl}
                        alt="Dark Logo"
                        style={{ width: 200, height: 80 }}
                        className="object-contain border rounded bg-slate-800 p-2"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute top-2 right-2"
                        onClick={() => removeImage("darkLogoUrl")}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => openImagePicker("darkLogoUrl")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Dark Logo
                    </Button>
                  )}
                </div>
                <div className="space-y-2">
                  <Label>Favicon</Label>
                  <p className="text-xs text-muted-foreground">Browser tab icon (recommended: 32×32 or 64×64 PNG/ICO/SVG)</p>
                  {settings.faviconUrl ? (
                    <div className="relative inline-block">
                      <img
                        src={settings.faviconUrl}
                        alt="Favicon"
                        style={{ width: 48, height: 48 }}
                        className="object-contain border rounded bg-white p-1"
                      />
                      <Button
                        size="sm"
                        variant="destructive"
                        className="absolute -top-1 -right-1 h-5 w-5 p-0 rounded-full"
                        onClick={() => setSettings({ ...settings, faviconUrl: "" })}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      onClick={() => openImagePicker("faviconUrl")}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload Favicon
                    </Button>
                  )}
                </div>
              </div>

              {/* Per-Screen Logo Overrides */}
              <div className="space-y-3 pt-4 border-t">
                <div>
                  <Label className="text-base font-semibold">Per-Screen Logo Overrides</Label>
                  <p className="text-xs text-muted-foreground mt-1">
                    Configure a different logo for each screen. Leave empty to use the global logos above.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {SCREEN_KEYS.map(({ key, label, dark }) => {
                    const entry = screenLogos[key] || { logoUrl: '', darkLogoUrl: '' };
                    const hasLogo = !!entry.logoUrl;
                    const hasDark = !!entry.darkLogoUrl;
                    return (
                      <div key={key} className="border rounded-lg p-3 space-y-2">
                        <p className="text-sm font-medium">{label}</p>
                        {/* Light logo */}
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">Logo {dark ? '(light ver.)' : ''}</p>
                          {hasLogo ? (
                            <div className="relative inline-block">
                              <img src={entry.logoUrl} alt={`${label} logo`} className="h-10 object-contain border rounded bg-white p-1" />
                              <button className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]" onClick={() => {
                                const updated = { ...screenLogos };
                                if (updated[key]) { updated[key] = { ...updated[key], logoUrl: '' }; }
                                setScreenLogos(updated);
                              }}>&times;</button>
                            </div>
                          ) : (
                            <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setScreenLogoPicker({ screen: key, field: 'logoUrl' })}>
                              <Upload className="h-3 w-3 mr-1" /> Set Logo
                            </Button>
                          )}
                        </div>
                        {/* Dark logo */}
                        {dark && (
                          <div className="space-y-1">
                            <p className="text-[11px] text-muted-foreground">Dark Logo (white ver.)</p>
                            {hasDark ? (
                              <div className="relative inline-block">
                                <img src={entry.darkLogoUrl} alt={`${label} dark logo`} className="h-10 object-contain border rounded bg-slate-800 p-1" />
                                <button className="absolute -top-1 -right-1 bg-destructive text-white rounded-full w-4 h-4 flex items-center justify-center text-[10px]" onClick={() => {
                                  const updated = { ...screenLogos };
                                  if (updated[key]) { updated[key] = { ...updated[key], darkLogoUrl: '' }; }
                                  setScreenLogos(updated);
                                }}>&times;</button>
                              </div>
                            ) : (
                              <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => setScreenLogoPicker({ screen: key, field: 'darkLogoUrl' })}>
                                <Upload className="h-3 w-3 mr-1" /> Set Dark Logo
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Image picker for per-screen logos */}
              {screenLogoPicker && (
                <ImageGalleryPicker
                  open={true}
                  onOpenChange={(open) => { if (!open) setScreenLogoPicker(null); }}
                  onSelect={(url: string) => {
                    const { screen, field } = screenLogoPicker;
                    setScreenLogos(prev => {
                      const existing = prev[screen] || { logoUrl: '', darkLogoUrl: '' };
                      return { ...prev, [screen]: { ...existing, [field]: url } };
                    });
                    setScreenLogoPicker(null);
                  }}
                  category="logo"
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Hero Section Tab */}
        <TabsContent value="hero" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Hero Section</p>
            </div>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-4 p-6 bg-background">
                <div className="space-y-3">
                  <h3 className="text-xl font-bold leading-tight">
                    {(() => {
                      const raw = settings.heroTitle || "Adjust Your Body | Get A Perfect Balance";
                      if (raw.includes("|")) {
                        const [main, highlight] = raw.split("|").map(s => s.trim());
                        return <>{main}{" "}<span className="text-primary">{highlight}</span></>;
                      }
                      return raw;
                    })()}
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {settings.heroSubtitle || "Expert physical rehabilitation and sports therapy in Richmond, UK."}
                  </p>
                  <div className="flex gap-2">
                    <span className="bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-md font-medium">
                      {settings.heroCTA || "Book Appointment"} →
                    </span>
                    <span className="border text-[10px] px-3 py-1.5 rounded-md">Client Portal</span>
                  </div>
                  <div className="flex gap-4 text-[10px] text-muted-foreground">
                    <span>✓ Fully Insured</span>
                    <span>✓ Open Every Day</span>
                    <span>✓ Richmond TW10 6AQ</span>
                  </div>
                </div>
                <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-muted">
                  {settings.heroImageUrl ? (
                    <img src={settings.heroImageUrl} alt="Hero" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image set</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Hero Section</CardTitle>
              <CardDescription>
                Main banner section at the top of your homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="heroTitle" fieldName="heroTitle" label="Hero Title" context="Main headline on the homepage hero banner" />
                <Input
                  id="heroTitle"
                  value={settings.heroTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, heroTitle: e.target.value })
                  }
                  placeholder="Adjust Your Body | Get A Perfect Balance"
                />
                <p className="text-xs text-muted-foreground">Use <code className="bg-muted px-1 rounded">|</code> to separate the highlighted part, e.g. "Main Text | Highlighted Text"</p>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="heroSubtitle" fieldName="heroSubtitle" label="Hero Subtitle" context="Subtext below the main headline on homepage" />
                <Textarea
                  id="heroSubtitle"
                  value={settings.heroSubtitle}
                  onChange={(e) =>
                    setSettings({ ...settings, heroSubtitle: e.target.value })
                  }
                  placeholder="Professional physiotherapy and sports rehabilitation"
                  rows={3}
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="heroCTA">Call-to-Action Button</Label>
                  <Input
                    id="heroCTA"
                    value={settings.heroCTA}
                    onChange={(e) =>
                      setSettings({ ...settings, heroCTA: e.target.value })
                    }
                    placeholder="Book Appointment"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="heroCTALink">Button Link</Label>
                  <Input
                    id="heroCTALink"
                    value={settings.heroCTALink}
                    onChange={(e) =>
                      setSettings({ ...settings, heroCTALink: e.target.value })
                    }
                    placeholder="/signup"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Background Image</Label>
                {settings.heroImageUrl ? (
                  <div className="relative inline-block">
                    <img src={settings.heroImageUrl} alt="Hero" style={{ width: 400, height: 200 }} className="object-cover border rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => removeImage("heroImageUrl")}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openImagePicker("heroImageUrl")}><Upload className="h-4 w-4 mr-2" />Upload Image</Button>
                    <AIImageGenerator section="Hero" defaultPrompt="Professional physiotherapy clinic hero image showing a modern treatment room or therapist helping a patient" onApply={(url) => setSettings({ ...settings, heroImageUrl: url })} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Portal Section Tab */}
        <TabsContent value="portal" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Portal Section</p>
            </div>
            <CardContent className="p-6 bg-card">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">
                  {(() => {
                    const raw = settings.portalTitle || "Your Rehabilitation Portal";
                    if (raw.includes("|")) {
                      const [main, highlight] = raw.split("|").map(s => s.trim());
                      return <>{main}{" "}<span className="text-primary">{highlight}</span></>;
                    }
                    if (raw.includes("Rehabilitation")) {
                      const parts = raw.split("Rehabilitation");
                      return <>{parts[0]}<span className="text-primary">Rehabilitation</span>{parts[1] || ""}</>;
                    }
                    return raw;
                  })()}
                </h3>
                <p className="text-xs text-muted-foreground mt-1">{settings.portalSubtitle || "Everything you need to manage your recovery journey in one secure place."}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {portalFeatures.map((f) => (
                  <div key={f.id} className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center mx-auto mb-2">
                      <span className="text-primary text-sm">{"\u2713"}</span>
                    </div>
                    <p className="text-[11px] font-semibold">{f.title || "Feature"}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Portal Section</CardTitle>
              <CardDescription>
                Your Rehabilitation Portal information block
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="portalTitle" fieldName="portalTitle" label="Portal Title" context="Title for the patient rehabilitation portal section" />
                <Input
                  id="portalTitle"
                  value={settings.portalTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, portalTitle: e.target.value })
                  }
                  placeholder="Your Rehabilitation Portal"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="portalSubtitle" fieldName="portalSubtitle" label="Portal Subtitle" context="Subtitle for the patient portal features section" />
                <Input
                  id="portalSubtitle"
                  value={settings.portalSubtitle}
                  onChange={(e) =>
                    setSettings({ ...settings, portalSubtitle: e.target.value })
                  }
                  placeholder="Access your personalized treatment plan"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="portalText" fieldName="portalText" label="Portal Description" context="Description of the patient portal and its features" />
                <Textarea
                  id="portalText"
                  value={settings.portalText}
                  onChange={(e) =>
                    setSettings({ ...settings, portalText: e.target.value })
                  }
                  placeholder="Manage appointments, view clinical notes..."
                  rows={3}
                />
              </div>
              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Portal Features</Label>
                  <Button size="sm" onClick={addPortalFeature}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Feature
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Icons: Calendar, FileText, ClipboardCheck, Zap, Heart, Shield,
                  Star, Activity, Users, Video, Dumbbell, Brain, Stethoscope,
                  Smartphone
                </p>
                {portalFeatures.map((feat) => (
                  <Card key={feat.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="space-y-1 w-28">
                          <Label className="text-xs">Icon</Label>
                          <Input
                            value={feat.icon}
                            onChange={(e) =>
                              updatePortalFeature(feat.id, "icon", e.target.value)
                            }
                            placeholder="Calendar"
                            className="text-xs"
                          />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input
                            value={feat.title}
                            onChange={(e) =>
                              updatePortalFeature(feat.id, "title", e.target.value)
                            }
                            placeholder="Feature title"
                          />
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive mt-5"
                          onClick={() => removePortalFeature(feat.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Description</Label>
                        <Input
                          value={feat.description}
                          onChange={(e) =>
                            updatePortalFeature(feat.id, "description", e.target.value)
                          }
                          placeholder="Feature description"
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Services Section Tab */}
        <TabsContent value="services" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Services Section</p>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">{settings.servicesTitle || "I Specialise In..."}</h3>
                <p className="text-xs text-muted-foreground mt-1">{settings.servicesSubtitle || "Comprehensive rehabilitation services tailored to your individual needs."}</p>
              </div>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
                {services.length > 0 ? services.map((s) => {
                  const SvcIcon = SERVICE_ICON_MAP[s.icon || ""] || Zap;
                  return (
                    <div key={s.id} className="border rounded-lg p-3">
                      <div className="flex items-start gap-2">
                        <SvcIcon className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <div>
                          <p className="text-[11px] font-semibold">{s.title}</p>
                          <p className="text-[9px] text-muted-foreground line-clamp-2">{s.description}</p>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <p className="col-span-4 text-center text-xs text-muted-foreground py-4">No services configured yet</p>
                )}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Services Section</CardTitle>
              <CardDescription>
                I Specialise In... - List your services and treatments
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="servicesTitle" fieldName="servicesTitle" label="Section Title" context="Title for the services overview section" />
                <Input
                  id="servicesTitle"
                  value={settings.servicesTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, servicesTitle: e.target.value })
                  }
                  placeholder="I Specialise In..."
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="servicesSubtitle" fieldName="servicesSubtitle" label="Section Subtitle" context="Subtitle for the services section" />
                <Textarea
                  id="servicesSubtitle"
                  value={settings.servicesSubtitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      servicesSubtitle: e.target.value,
                    })
                  }
                  placeholder="Professional treatments for your recovery"
                  rows={2}
                />
              </div>

              {/* Link to Service Pages editor */}
              <div className="rounded-lg border border-primary/20 bg-primary/5 p-4 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Service Detail Pages</p>
                  <p className="text-xs text-muted-foreground">Manage the full detail pages for each service (content, images, SEO, AI generation)</p>
                </div>
                <Button variant="outline" size="sm" className="gap-1.5 shrink-0" onClick={() => window.open("/admin/service-pages", "_blank")}>
                  <ExternalLink className="h-3.5 w-3.5" /> Manage Service Pages
                </Button>
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Services List</Label>
                  <Button size="sm" onClick={addService}>
                    <Plus className="h-4 w-4 mr-2" />
                    Add Service
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">Icons: Zap, Activity, Waves, Dumbbell, HeartPulse, Bone, Brain, ScanLine, Footprints, Syringe, Stethoscope, Shield, Target, Flame</p>
                {services.map((service) => (
                  <Card key={service.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="space-y-1 w-28">
                          <Label className="text-xs">Icon</Label>
                          <Input value={service.icon || ""} onChange={(e) => updateService(service.id, "icon", e.target.value)} placeholder="Zap" className="text-xs" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input value={service.title} onChange={(e) => updateService(service.id, "title", e.target.value)} placeholder="Service name (e.g., Kinesiotherapy)" />
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive mt-5" onClick={() => removeService(service.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <Textarea
                        value={service.description}
                        onChange={(e) =>
                          updateService(service.id, "description", e.target.value)
                        }
                        placeholder="Service description"
                        rows={2}
                      />
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Insoles Block Tab */}
        <TabsContent value="insoles" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Custom Insoles / Foot Scan Block</CardTitle>
              <CardDescription>
                Edit the insoles and foot scan section on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="insolesTitle" fieldName="insolesTitle" label="Title" context="Title for the custom insoles / foot scan section" />
                <Input id="insolesTitle" value={settings.insolesTitle} onChange={(e) => setSettings({ ...settings, insolesTitle: e.target.value })} placeholder="Custom-Made Insoles" />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="insolesSubtitle" fieldName="insolesSubtitle" label="Subtitle" context="Subtitle for the custom insoles section" />
                <Input id="insolesSubtitle" value={settings.insolesSubtitle} onChange={(e) => setSettings({ ...settings, insolesSubtitle: e.target.value })} placeholder="For Your Unique Feet" />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="insolesDesc" fieldName="insolesDesc" label="Description" context="Description of custom insoles service and foot scanning" />
                <Textarea id="insolesDesc" value={settings.insolesDesc} onChange={(e) => setSettings({ ...settings, insolesDesc: e.target.value })} placeholder="Every foot is different. Our custom insoles..." rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                {settings.insolesImageUrl ? (
                  <div className="relative inline-block">
                    <img src={settings.insolesImageUrl} alt="Insoles" style={{ width: 400, height: 200 }} className="object-cover border rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => removeImage("insolesImageUrl")}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openImagePicker("insolesImageUrl")}><Upload className="h-4 w-4 mr-2" />Upload Image</Button>
                    <AIImageGenerator section="Insoles" defaultPrompt="Custom orthotic insoles, foot scanning technology, podiatry clinic" aspectRatio="16:9" onApply={(url) => setSettings({ ...settings, insolesImageUrl: url })} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="insolesBenefitsJson">Benefits (JSON array of strings)</Label>
                <Textarea id="insolesBenefitsJson" value={settings.insolesBenefitsJson} onChange={(e) => setSettings({ ...settings, insolesBenefitsJson: e.target.value })} placeholder='["Plantar fasciitis relief", "Flat feet support", ...]' rows={4} />
                <p className="text-xs text-muted-foreground">JSON array of benefit strings, e.g. ["Benefit 1", "Benefit 2"]</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="insolesStepsJson">Process Steps (JSON array)</Label>
                <Textarea id="insolesStepsJson" value={settings.insolesStepsJson} onChange={(e) => setSettings({ ...settings, insolesStepsJson: e.target.value })} placeholder='[{"title": "Digital Foot Scan", "desc": "..."}]' rows={6} />
                <p className="text-xs text-muted-foreground">JSON array of objects with "title" and "desc" fields</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Biomechanics Block Tab */}
        <TabsContent value="biomechanics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Biomechanical Assessment Block</CardTitle>
              <CardDescription>
                Edit the biomechanical assessment section on the homepage
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="bioTitle" fieldName="bioTitle" label="Title" context="Title for the biomechanical assessment section" />
                <Input id="bioTitle" value={settings.bioTitle} onChange={(e) => setSettings({ ...settings, bioTitle: e.target.value })} placeholder="Biomechanical Assessment" />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="bioSubtitle" fieldName="bioSubtitle" label="Subtitle" context="Subtitle for the biomechanical assessment section" />
                <Input id="bioSubtitle" value={settings.bioSubtitle} onChange={(e) => setSettings({ ...settings, bioSubtitle: e.target.value })} placeholder="Find The Root Cause" />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="bioDesc" fieldName="bioDesc" label="Description" context="Description of biomechanical assessment with advanced technology (therapist-led, technology-assisted)" />
                <Textarea id="bioDesc" value={settings.bioDesc} onChange={(e) => setSettings({ ...settings, bioDesc: e.target.value })} placeholder="Our comprehensive biomechanical assessment uses AI..." rows={5} />
              </div>
              <div className="space-y-2">
                <Label>Image</Label>
                {settings.bioImageUrl ? (
                  <div className="relative inline-block">
                    <img src={settings.bioImageUrl} alt="Biomechanics" style={{ width: 400, height: 200 }} className="object-cover border rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => removeImage("bioImageUrl")}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openImagePicker("bioImageUrl")}><Upload className="h-4 w-4 mr-2" />Upload Image</Button>
                    <AIImageGenerator section="Biomechanics" defaultPrompt="Biomechanical assessment, posture analysis technology, body scanning in clinic" aspectRatio="16:9" onApply={(url) => setSettings({ ...settings, bioImageUrl: url })} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="bioBenefitsJson">Benefits (JSON array of strings)</Label>
                <Textarea id="bioBenefitsJson" value={settings.bioBenefitsJson} onChange={(e) => setSettings({ ...settings, bioBenefitsJson: e.target.value })} placeholder='["Full-body posture scoring", "Joint angle measurements", ...]' rows={4} />
                <p className="text-xs text-muted-foreground">JSON array of benefit strings</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bioStepsJson">Process Steps (JSON array)</Label>
                <Textarea id="bioStepsJson" value={settings.bioStepsJson} onChange={(e) => setSettings({ ...settings, bioStepsJson: e.target.value })} placeholder='[{"title": "Multi-Angle Capture", "desc": "..."}]' rows={6} />
                <p className="text-xs text-muted-foreground">JSON array of objects with "title" and "desc" fields</p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* MLS® Laser Therapy Tab */}
        <TabsContent value="mls-laser" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>MLS® Laser Therapy Section</CardTitle>
              <CardDescription>Edit the MLS Laser Therapy featured section on the homepage. All fields are stored as a single JSON object.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {(() => {
                let mls: any = {};
                try { mls = settings.mlsLaserJson ? JSON.parse(settings.mlsLaserJson) : {}; } catch {}
                const setMls = (field: string, val: any) => {
                  const updated = { ...mls, [field]: val };
                  setSettings({ ...settings, mlsLaserJson: JSON.stringify(updated) });
                };
                return (
                  <>
                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Section Title (line 1)</Label>
                        <Input value={mls.title || ""} onChange={(e) => setMls("title", e.target.value)} placeholder="MLS® Laser Therapy —" />
                      </div>
                      <div className="space-y-2">
                        <Label>Title Highlight (gradient text)</Label>
                        <Input value={mls.title2 || ""} onChange={(e) => setMls("title2", e.target.value)} placeholder="Accelerate Your Recovery" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Description</Label>
                      <Textarea value={mls.desc || ""} onChange={(e) => setMls("desc", e.target.value)} placeholder="Our Mphi 75 Multiwave Locked System delivers..." rows={4} />
                    </div>
                    <div className="space-y-2">
                      <Label>Badge Text (overlay on treatment image)</Label>
                      <Input value={mls.badge || ""} onChange={(e) => setMls("badge", e.target.value)} placeholder="Pain-free · Non-invasive · Clinically proven" />
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">Images</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Treatment Image URL</Label>
                          {mls.treatmentImageUrl ? (
                            <div className="relative inline-block">
                              <img src={mls.treatmentImageUrl} alt="Treatment" style={{ width: 300, height: 180 }} className="object-cover border rounded" />
                              <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setMls("treatmentImageUrl", "")}><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => { setCurrentImageField("__mls_treatment"); setShowImagePicker(true); }}><Upload className="h-4 w-4 mr-2" />Upload</Button>
                            </div>
                          )}
                          <Input value={mls.treatmentImageUrl || ""} onChange={(e) => setMls("treatmentImageUrl", e.target.value)} placeholder="/uploads/mls-laser-treatment.jpg" className="text-xs" />
                        </div>
                        <div className="space-y-2">
                          <Label>Device Image URL</Label>
                          {mls.deviceImageUrl ? (
                            <div className="relative inline-block">
                              <img src={mls.deviceImageUrl} alt="Device" style={{ width: 300, height: 180 }} className="object-cover border rounded" />
                              <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => setMls("deviceImageUrl", "")}><X className="h-4 w-4" /></Button>
                            </div>
                          ) : (
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => { setCurrentImageField("__mls_device"); setShowImagePicker(true); }}><Upload className="h-4 w-4 mr-2" />Upload</Button>
                            </div>
                          )}
                          <Input value={mls.deviceImageUrl || ""} onChange={(e) => setMls("deviceImageUrl", e.target.value)} placeholder="/uploads/mls-laser-device.jpg" className="text-xs" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">Dual Wavelength Technology</p>
                      <div className="grid md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <Label>808nm Description</Label>
                          <Input value={mls.wave808 || ""} onChange={(e) => setMls("wave808", e.target.value)} placeholder="Continuous emission — anti-inflammatory" />
                        </div>
                        <div className="space-y-2">
                          <Label>905nm Description</Label>
                          <Input value={mls.wave905 || ""} onChange={(e) => setMls("wave905", e.target.value)} placeholder="Pulsed emission — analgesic effects" />
                        </div>
                        <div className="space-y-2">
                          <Label>Dual Wavelength Note</Label>
                          <Input value={mls.dualText || ""} onChange={(e) => setMls("dualText", e.target.value)} placeholder="Patented synchronized dual-wavelength" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">Benefits (6 items)</p>
                      <Textarea value={mls.benefitsJson || ""} onChange={(e) => setMls("benefitsJson", e.target.value)} placeholder='["Rapid pain relief from the first session", "Powerful anti-inflammatory action", ...]' rows={5} />
                      <p className="text-xs text-muted-foreground">JSON array of 6 benefit strings</p>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">Conditions Treated</p>
                      <Textarea value={mls.conditionsJson || ""} onChange={(e) => setMls("conditionsJson", e.target.value)} placeholder='["Osteoarthritis", "Rheumatoid Arthritis", "Sports Injuries", ...]' rows={4} />
                      <p className="text-xs text-muted-foreground">JSON array of condition name strings</p>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">Stats Bar (4 items)</p>
                      <Textarea value={mls.statsJson || ""} onChange={(e) => setMls("statsJson", e.target.value)} placeholder='[{"value":"75W","label":"Peak Power"},{"value":"3 kg","label":"Portable Device"}]' rows={4} />
                      <p className="text-xs text-muted-foreground">JSON array of objects with "value" and "label"</p>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-3">CTA Buttons</p>
                      <div className="grid md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Primary CTA Text</Label>
                          <Input value={mls.ctaText || ""} onChange={(e) => setMls("ctaText", e.target.value)} placeholder="Book MLS® Treatment" />
                        </div>
                        <div className="space-y-2">
                          <Label>Learn More Text</Label>
                          <Input value={mls.learnMoreText || ""} onChange={(e) => setMls("learnMoreText", e.target.value)} placeholder="Learn More" />
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-4 mt-3">
                        <div className="space-y-2">
                          <Label>Primary CTA Link</Label>
                          <Input value={mls.ctaLink || ""} onChange={(e) => setMls("ctaLink", e.target.value)} placeholder="/signup" />
                        </div>
                        <div className="space-y-2">
                          <Label>Learn More Link</Label>
                          <Input value={mls.learnMoreLink || ""} onChange={(e) => setMls("learnMoreLink", e.target.value)} placeholder="/services/laser-shockwave" />
                        </div>
                      </div>
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-1">Section Label (top badge)</p>
                      <Input value={mls.label || ""} onChange={(e) => setMls("label", e.target.value)} placeholder="Advanced Laser Therapy" />
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-1">Benefits Section Title</p>
                      <Input value={mls.benefitsTitle || ""} onChange={(e) => setMls("benefitsTitle", e.target.value)} placeholder="Why MLS® Laser Therapy?" />
                    </div>

                    <div className="border-t pt-4 mt-2">
                      <p className="text-sm font-semibold mb-1">Conditions Section Title</p>
                      <Input value={mls.conditionsTitle || ""} onChange={(e) => setMls("conditionsTitle", e.target.value)} placeholder="Effective for these conditions" />
                    </div>
                  </>
                );
              })()}
            </CardContent>
          </Card>
        </TabsContent>

        {/* About Section Tab */}
        <TabsContent value="about" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — About Section</p>
            </div>
            <CardContent className="p-0">
              <div className="grid md:grid-cols-2 gap-4 p-6 bg-card">
                <div className="space-y-2">
                  <h3 className="text-lg font-bold">
                    {(() => {
                      const raw = settings.aboutTitle || "Bruno Physical | Rehabilitation";
                      if (raw.includes("|")) {
                        const [main, highlight] = raw.split("|").map(s => s.trim());
                        return <><span className="text-secondary">{main}</span>{" "}{highlight}</>;
                      }
                      return raw;
                    })()}
                  </h3>
                  <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                    {(settings.aboutText || "My name is Bruno, and I'm a therapist based in the UK...").split("\n\n").slice(0, 2).map((p, i) => (
                      <p key={i} className="line-clamp-3">{p}</p>
                    ))}
                  </div>
                  <span className="inline-block bg-primary text-primary-foreground text-[10px] px-3 py-1.5 rounded-md mt-2">Book a Consultation \u2192</span>
                </div>
                <div className="relative aspect-square rounded-xl overflow-hidden bg-muted">
                  {settings.aboutImageUrl ? (
                    <img src={settings.aboutImageUrl} alt="About" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">No image set</div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>About Section</CardTitle>
              <CardDescription>
                Bruno Physical Rehabilitation - Tell your story
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="aboutTitle" fieldName="aboutTitle" label="About Title" context="Title for the About section" />
                <Input
                  id="aboutTitle"
                  value={settings.aboutTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, aboutTitle: e.target.value })
                  }
                  placeholder="Bruno Physical Rehabilitation"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="aboutText" fieldName="aboutText" label="About Text" context="About the therapist Bruno - personal story, background, experience" />
                <Textarea
                  id="aboutText"
                  value={settings.aboutText}
                  onChange={(e) =>
                    setSettings({ ...settings, aboutText: e.target.value })
                  }
                  placeholder="Your professional background and expertise..."
                  rows={8}
                />
              </div>
              <div className="space-y-2">
                <Label>About Image</Label>
                {settings.aboutImageUrl ? (
                  <div className="relative inline-block">
                    <img src={settings.aboutImageUrl} alt="About" style={{ width: 400, height: 300 }} className="object-cover border rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => removeImage("aboutImageUrl")}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openImagePicker("aboutImageUrl")}><Upload className="h-4 w-4 mr-2" />Upload Image</Button>
                    <AIImageGenerator section="About" defaultPrompt="Professional portrait of a physiotherapist in a modern clinic setting" aspectRatio="1:1" onApply={(url) => setSettings({ ...settings, aboutImageUrl: url })} />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles Section Tab */}
        <TabsContent value="articles" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Articles Section</p>
            </div>
            <CardContent className="p-6">
              <div className="text-center mb-4">
                <p className="text-secondary text-[11px] font-medium mb-1">{settings.articlesTitle || "Stay Informed. Stay Empowered."}</p>
                <h3 className="text-lg font-bold">Latest <span className="text-primary">Articles</span></h3>
                <p className="text-xs text-muted-foreground mt-1">{settings.articlesSubtitle || "Evidence-based insights to support your rehabilitation journey."}</p>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="border rounded-lg overflow-hidden">
                    <div className="aspect-video bg-muted" />
                    <div className="p-2">
                      <div className="h-2 bg-muted rounded w-3/4 mb-1" />
                      <div className="h-1.5 bg-muted/60 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Articles Section</CardTitle>
              <CardDescription>
                Stay Informed. Stay Empowered - Latest articles preview
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="articlesTitle" fieldName="articlesTitle" label="Section Title" context="Title for the articles/blog section" />
                <Input
                  id="articlesTitle"
                  value={settings.articlesTitle}
                  onChange={(e) =>
                    setSettings({ ...settings, articlesTitle: e.target.value })
                  }
                  placeholder="Stay Informed. Stay Empowered"
                />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="articlesSubtitle" fieldName="articlesSubtitle" label="Section Subtitle" context="Subtitle for the articles section" />
                <Textarea
                  id="articlesSubtitle"
                  value={settings.articlesSubtitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      articlesSubtitle: e.target.value,
                    })
                  }
                  placeholder="Latest insights from our blog"
                  rows={2}
                />
              </div>
            </CardContent>
          </Card>

          {/* Articles Management */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Published Articles</CardTitle>
                  <CardDescription>Manage your blog articles directly from here</CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => window.open("/admin/articles", "_blank")}>
                    View All
                  </Button>
                  <Button size="sm" onClick={() => window.open("/admin/articles/new", "_blank")}>
                    <Plus className="h-4 w-4 mr-1" /> New Article
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ArticlesListInline />
            </CardContent>
          </Card>
        </TabsContent>

        {/* Articles Placeholder Tab */}
        <TabsContent value="placeholder" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Articles Placeholder</CardTitle>
              <CardDescription>
                Shown when no articles are available
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="articlesPlaceholderTitle">Placeholder Title</Label>
                <Input
                  id="articlesPlaceholderTitle"
                  value={settings.articlesPlaceholderTitle}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      articlesPlaceholderTitle: e.target.value,
                    })
                  }
                  placeholder="Articles Coming Soon"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="articlesPlaceholderText">Placeholder Text</Label>
                <Textarea
                  id="articlesPlaceholderText"
                  value={settings.articlesPlaceholderText}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      articlesPlaceholderText: e.target.value,
                    })
                  }
                  placeholder="We're working on bringing you valuable content..."
                  rows={4}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Contact Section Tab */}
        <TabsContent value="contact" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Contact Section</p>
            </div>
            <CardContent className="p-6 bg-card">
              <div className="text-center mb-4">
                <h3 className="text-lg font-bold">Get in <span className="text-primary">Touch</span></h3>
                <p className="text-xs text-muted-foreground mt-1">{settings.contactSubtitle || "Home visit or our clinic — we're open every day, including weekends."}</p>
              </div>
              <div className={`grid grid-cols-${Math.min(contactCards.length, 3)} gap-3`}>
                {contactCards.map((c) => (
                  <div key={c.id} className="bg-muted/50 rounded-lg p-3 text-center">
                    <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center mx-auto mb-2">
                      <span className="text-secondary text-sm">{"\u2713"}</span>
                    </div>
                    <p className="text-[11px] font-semibold">{c.title || "Card"}</p>
                    <p className="text-[9px] text-muted-foreground">{c.content?.split("\n")[0] || ""}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Contact Section</CardTitle>
              <CardDescription>Get in Touch - Add, edit, or remove contact information cards</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="contactTitle" fieldName="contactTitle" label="Section Title" context="Title for the contact section" />
                <Input id="contactTitle" value={settings.contactTitle} onChange={(e) => setSettings({ ...settings, contactTitle: e.target.value })} placeholder="Get in Touch" />
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="contactSubtitle" fieldName="contactSubtitle" label="Section Subtitle" context="Subtitle for the contact section" />
                <Input id="contactSubtitle" value={settings.contactSubtitle} onChange={(e) => setSettings({ ...settings, contactSubtitle: e.target.value })} placeholder="We're here to help" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" value={settings.phone} onChange={(e) => setSettings({ ...settings, phone: e.target.value })} placeholder="+44 7XXX XXXXXX" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input id="address" value={settings.address} onChange={(e) => setSettings({ ...settings, address: e.target.value })} placeholder="The Vineyard, Richmond TW10 6AQ" />
                </div>
              </div>

              <div className="p-4 bg-green-50 rounded-lg border border-green-200 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 font-semibold text-green-800">
                    <svg viewBox="0 0 24 24" className="w-4 h-4 fill-green-600"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp Button
                  </Label>
                  <button
                    type="button"
                    onClick={() => setSettings({ ...settings, whatsappEnabled: !settings.whatsappEnabled })}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.whatsappEnabled ? "bg-green-500" : "bg-gray-300"}`}
                  >
                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.whatsappEnabled ? "translate-x-6" : "translate-x-1"}`} />
                  </button>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappNumber" className="text-xs text-green-700">Phone Number (with country code, no + or spaces)</Label>
                  <Input id="whatsappNumber" value={settings.whatsappNumber} onChange={(e) => setSettings({ ...settings, whatsappNumber: e.target.value })} placeholder="447473000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="whatsappMessage" className="text-xs text-green-700">Pre-filled Message (optional)</Label>
                  <Input id="whatsappMessage" value={settings.whatsappMessage} onChange={(e) => setSettings({ ...settings, whatsappMessage: e.target.value })} placeholder="Hello, I'd like to book an appointment at BPR Ipswich" />
                </div>
                {settings.whatsappEnabled && settings.whatsappNumber && (
                  <div className="flex items-center gap-2 text-xs text-green-700 bg-green-100 rounded px-3 py-2">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                    WhatsApp button is <strong>active</strong> — visible in the site header and contact section
                  </div>
                )}
              </div>

              <div className="space-y-3 pt-4">
                <div className="flex items-center justify-between">
                  <Label>Contact Info Cards</Label>
                  <Button size="sm" onClick={addContactCard}><Plus className="h-4 w-4 mr-2" />Add Card</Button>
                </div>
                <p className="text-xs text-muted-foreground">Icons: MapPin, Clock, Phone, Mail, Globe, MessageCircle, Instagram, Facebook</p>
                {contactCards.map((card) => (
                  <Card key={card.id} className="p-4">
                    <div className="space-y-3">
                      <div className="flex gap-2 items-start">
                        <div className="space-y-1 w-28">
                          <Label className="text-xs">Icon</Label>
                          <Input value={card.icon} onChange={(e) => updateContactCard(card.id, "icon", e.target.value)} placeholder="MapPin" className="text-xs" />
                        </div>
                        <div className="flex-1 space-y-1">
                          <Label className="text-xs">Title</Label>
                          <Input value={card.title} onChange={(e) => updateContactCard(card.id, "title", e.target.value)} placeholder="Location" />
                        </div>
                        <Button size="sm" variant="ghost" className="text-destructive mt-5" onClick={() => removeContactCard(card.id)}><Trash2 className="h-4 w-4" /></Button>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Content</Label>
                        <Textarea value={card.content} onChange={(e) => updateContactCard(card.id, "content", e.target.value)} placeholder="Card content..." rows={2} />
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Footer Tab */}
        <TabsContent value="footer" className="space-y-4">
          {/* LIVE PREVIEW */}
          <Card className="overflow-hidden border-primary/20">
            <div className="bg-muted/30 px-4 py-2 border-b flex items-center justify-between">
              <p className="text-xs font-semibold text-primary uppercase tracking-wider">Live Preview — Footer</p>
              <span className="text-[10px] text-muted-foreground">Updates as you edit</span>
            </div>
            <CardContent className="p-0">
              {(() => {
                const mods: Record<string,boolean> = settings.footerModulesJson ? (() => { try { return JSON.parse(settings.footerModulesJson); } catch { return {}; }})() : {};
                const show = (k: string) => mods[k] === true;
                const sl: {id:string;platform:string;url:string}[] = (() => { try { return JSON.parse(settings.socialLinksJson || "[]"); } catch { return []; }})();
                return (
                  <div className="bg-primary text-primary-foreground py-5 px-6">
                    <div className="grid grid-cols-3 gap-4 mb-4">
                      {show('logo') && (
                        <div className="flex flex-col gap-1">
                          {settings.logoUrl ? <img src={settings.logoUrl} alt="Logo" className="h-8 object-contain" /> : <div className="h-8 w-20 rounded bg-primary-foreground/20 flex items-center justify-center text-[10px] font-bold">{settings.siteName || "BPR"}</div>}
                          {settings.tagline && <p className="text-[9px] text-primary-foreground/50">{settings.tagline}</p>}
                        </div>
                      )}
                      {show('links') && footerLinks.length > 0 && (
                        <div className="flex flex-col gap-1">
                          <p className="text-[9px] font-bold uppercase tracking-wider text-primary-foreground/40 mb-1">Links</p>
                          {footerLinks.slice(0,4).map(l => <span key={l.id} className="text-[10px] text-primary-foreground/60">{l.title}</span>)}
                        </div>
                      )}
                      <div className="flex flex-col items-end gap-1">
                        {show('contact') && settings.email && <span className="text-[10px] text-primary-foreground/60">{settings.email}</span>}
                        {show('contact') && settings.phone && <span className="text-[10px] text-primary-foreground/60">{settings.phone}</span>}
                        {show('social') && sl.length > 0 && <div className="flex gap-2 mt-1">{sl.slice(0,4).map(s => <span key={s.id} className="text-[9px] text-primary-foreground/50 uppercase">{s.platform}</span>)}</div>}
                      </div>
                    </div>
                    {show('copyright') && (
                      <div className="border-t border-primary-foreground/20 pt-3 text-center">
                        <p className="text-[10px] text-primary-foreground/50">{settings.footerText || `© ${new Date().getFullYear()} Bruno Physical Rehabilitation. All rights reserved.`}</p>
                      </div>
                    )}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Footer Modules */}
          <Card>
            <CardHeader>
              <CardTitle>Footer Modules</CardTitle>
              <CardDescription>Enable or disable each section of the footer</CardDescription>
            </CardHeader>
            <CardContent>
              {(() => {
                const mods: Record<string,boolean> = settings.footerModulesJson ? (() => { try { return JSON.parse(settings.footerModulesJson); } catch { return {}; }})() : {};
                const toggle = (k: string) => {
                  const updated = { ...mods, [k]: !mods[k] };
                  setSettings({ ...settings, footerModulesJson: JSON.stringify(updated) });
                };
                const show = (k: string) => mods[k] === true;
                const modules = [
                  { key: 'logo', label: 'Logo & Tagline', desc: 'Show logo and tagline in footer' },
                  { key: 'links', label: 'Navigation Links', desc: 'Show footer navigation links' },
                  { key: 'social', label: 'Social Media Icons', desc: 'Show social media links' },
                  { key: 'contact', label: 'Contact Info', desc: 'Show email and phone' },
                  { key: 'copyright', label: 'Copyright Bar', desc: 'Show copyright text at bottom' },
                ];
                return (
                  <div className="space-y-2">
                    {modules.map(m => (
                      <div key={m.key} className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                        <div>
                          <p className="text-sm font-medium">{m.label}</p>
                          <p className="text-xs text-muted-foreground">{m.desc}</p>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggle(m.key)}
                          className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${show(m.key) ? "bg-primary" : "bg-gray-300"}`}
                        >
                          <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${show(m.key) ? "translate-x-6" : "translate-x-1"}`} />
                        </button>
                      </div>
                    ))}
                  </div>
                );
              })()}
            </CardContent>
          </Card>

          {/* Footer Logo & Tagline */}
          <Card>
            <CardHeader>
              <CardTitle>Footer Logo & Tagline</CardTitle>
              <CardDescription>Logo displayed in the footer (uses Branding logo if not set separately)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Footer Logo</Label>
                {(() => {
                  const footerLogo = screenLogos?.landingFooter?.darkLogoUrl || screenLogos?.landingFooter?.logoUrl || settings.darkLogoUrl || settings.logoUrl;
                  return footerLogo ? (
                    <div className="flex items-center gap-4">
                      <div className="relative inline-block bg-primary rounded-lg p-3">
                        <img src={footerLogo} alt="Footer Logo" className="h-10 object-contain" />
                      </div>
                      <div className="flex flex-col gap-1">
                        <Button variant="outline" size="sm" onClick={() => setScreenLogoPicker({ screen: 'landingFooter', field: 'darkLogoUrl' })}>
                          <Upload className="h-3.5 w-3.5 mr-1.5" /> Change Logo
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => {
                          setScreenLogos({ ...screenLogos, landingFooter: { logoUrl: '', darkLogoUrl: '' } });
                        }}>
                          <Trash2 className="h-3.5 w-3.5 mr-1.5" /> Remove Footer Logo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <div className="w-24 h-10 rounded bg-muted flex items-center justify-center text-xs text-muted-foreground">No logo</div>
                      <Button variant="outline" size="sm" onClick={() => setScreenLogoPicker({ screen: 'landingFooter', field: 'darkLogoUrl' })}>
                        <Upload className="h-3.5 w-3.5 mr-1.5" /> Pick Footer Logo
                      </Button>
                    </div>
                  );
                })()}
                <p className="text-xs text-muted-foreground">Recommended: Use a white/light logo for the dark footer background. Falls back to Branding dark logo if not set.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerTagline">Tagline</Label>
                <Input
                  id="footerTagline"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                  placeholder="Where Innovation Meets Care"
                />
                <p className="text-xs text-muted-foreground">Also shown in other areas of the site (shared with Branding)</p>
              </div>
            </CardContent>
          </Card>

          {/* Footer Contact Info */}
          <Card>
            <CardHeader>
              <CardTitle>Footer Contact Info</CardTitle>
              <CardDescription>Email, phone, and address shown in the footer</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="footerEmail">Email</Label>
                <Input
                  id="footerEmail"
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="admin@bpr.rehab"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerPhone">Phone</Label>
                <Input
                  id="footerPhone"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+44 7XXX XXXXXX"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerAddress">Address</Label>
                <Input
                  id="footerAddress"
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="The Vineyard, Richmond TW10 6AQ"
                />
              </div>
              <p className="text-xs text-muted-foreground">These fields are shared with the Contact section</p>
            </CardContent>
          </Card>

          {/* Footer Copyright Text */}
          <Card>
            <CardHeader>
              <CardTitle>Copyright Text</CardTitle>
              <CardDescription>Text shown at the bottom of the footer</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                value={settings.footerText}
                onChange={(e) => setSettings({ ...settings, footerText: e.target.value })}
                placeholder="© 2026 BPR. All rights reserved."
                rows={2}
              />
            </CardContent>
          </Card>

          {/* Footer Navigation Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Navigation Links</CardTitle>
                  <CardDescription>Links shown in the footer navigation column</CardDescription>
                </div>
                <Button size="sm" onClick={addFooterLink}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {footerLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No footer links yet. Add links like &quot;Home&quot;, &quot;Services&quot;, &quot;Contact&quot;, etc.</p>
              )}
              {footerLinks.map((link) => (
                <div key={link.id} className="flex gap-2 items-center">
                  <Input value={link.title} onChange={(e) => updateFooterLink(link.id, "title", e.target.value)} placeholder="Link title" className="flex-1" />
                  <Input value={link.url} onChange={(e) => updateFooterLink(link.id, "url", e.target.value)} placeholder="URL (e.g. /#services)" className="flex-1" />
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => removeFooterLink(link.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Footer Social Media Links */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Social Media Links</CardTitle>
                  <CardDescription>Social media icons shown in the footer</CardDescription>
                </div>
                <Button size="sm" onClick={addSocialLink}>
                  <Plus className="h-4 w-4 mr-1.5" /> Add Link
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {socialLinks.length === 0 && (
                <p className="text-sm text-muted-foreground text-center py-4">No social links yet. Add platforms like Instagram, Facebook, LinkedIn, etc.</p>
              )}
              {socialLinks.map((link) => (
                <div key={link.id} className="flex gap-2 items-center">
                  <Input value={link.platform} onChange={(e) => updateSocialLink(link.id, "platform", e.target.value)} placeholder="Platform (Instagram, Facebook, LinkedIn)" className="flex-1" />
                  <Input value={link.url} onChange={(e) => updateSocialLink(link.id, "url", e.target.value)} placeholder="URL" className="flex-1" />
                  <Button size="sm" variant="ghost" className="text-destructive shrink-0" onClick={() => removeSocialLink(link.id)}><Trash2 className="h-4 w-4" /></Button>
                </div>
              ))}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Terms of Use Tab */}
        <TabsContent value="terms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Terms of Use & Privacy Policy</CardTitle>
              <CardDescription>
                Edit the content displayed on the /terms page. Use HTML formatting. Leave empty to use the default bilingual terms.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="termsContentHtml">Custom Terms HTML Content</Label>
                <Textarea
                  id="termsContentHtml"
                  value={(settings as any).termsContentHtml || ""}
                  onChange={(e) => setSettings({ ...settings, termsContentHtml: e.target.value } as any)}
                  placeholder="<h2>Terms & Conditions</h2>\n<p>Your custom terms content here...</p>\n\n<h2>Privacy Policy</h2>\n<p>Your custom privacy policy...</p>"
                  rows={20}
                  className="font-mono text-xs"
                />
                <p className="text-xs text-muted-foreground">
                  Supports HTML tags: &lt;h2&gt;, &lt;h3&gt;, &lt;p&gt;, &lt;strong&gt;, &lt;ul&gt;, &lt;ol&gt;, &lt;li&gt;, &lt;a&gt;, etc.
                  Leave empty to show the default built-in terms (bilingual EN/PT).
                </p>
              </div>
              <div className="flex items-center gap-3">
                <a href="/terms" target="_blank" rel="noopener noreferrer">
                  <Button type="button" variant="outline" size="sm" className="gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" />
                    Preview /terms page
                  </Button>
                </a>
                {(settings as any).termsContentHtml && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setSettings({ ...settings, termsContentHtml: "" } as any)}
                  >
                    <Trash2 className="h-3.5 w-3.5 mr-1" />
                    Clear custom content (use defaults)
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* SEO Tab */}
        <TabsContent value="seo" className="space-y-4">
          {/* Basic SEO */}
          <Card>
            <CardHeader>
              <CardTitle>Basic SEO & Meta Tags</CardTitle>
              <CardDescription>Core meta tags for search engine visibility</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <FieldLabel htmlFor="metaTitle" fieldName="metaTitle" label="Meta Title" context="SEO meta title for search engines — physiotherapy clinic in Richmond, London (50-60 chars)" />
                <Input id="metaTitle" value={settings.metaTitle} onChange={(e) => setSettings({ ...settings, metaTitle: e.target.value })} placeholder="Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond" />
                <p className="text-xs text-muted-foreground">Recommended: 50-60 characters ({settings.metaTitle?.length || 0} chars)</p>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="metaDescription" fieldName="metaDescription" label="Meta Description" context="SEO meta description for a physiotherapy clinic — include location, services, and unique selling points (150-160 chars)" />
                <Textarea id="metaDescription" value={settings.metaDescription} onChange={(e) => setSettings({ ...settings, metaDescription: e.target.value })} placeholder="Professional physiotherapy and sports rehabilitation services in Richmond, TW10..." rows={4} />
                <p className="text-xs text-muted-foreground">Recommended: 150-160 characters ({settings.metaDescription?.length || 0} chars)</p>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="metaKeywords" fieldName="metaKeywords" label="Meta Keywords" context="SEO keywords for a physiotherapy clinic — include services, locations, conditions treated, comma-separated" />
                <Textarea id="metaKeywords" value={settings.metaKeywords} onChange={(e) => setSettings({ ...settings, metaKeywords: e.target.value })} placeholder="physiotherapy, sports rehabilitation, Richmond, London, TW10..." rows={3} />
                <p className="text-xs text-muted-foreground">Separate keywords with commas</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="canonicalUrl">Canonical URL</Label>
                  <Input id="canonicalUrl" value={settings.canonicalUrl} onChange={(e) => setSettings({ ...settings, canonicalUrl: e.target.value })} placeholder="https://bpr.rehab" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="robotsMeta">Robots Meta</Label>
                  <Input id="robotsMeta" value={settings.robotsMeta} onChange={(e) => setSettings({ ...settings, robotsMeta: e.target.value })} placeholder="index, follow" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="googleVerification">Google Search Console Verification</Label>
                  <Input id="googleVerification" value={settings.googleVerification} onChange={(e) => setSettings({ ...settings, googleVerification: e.target.value })} placeholder="google-site-verification=XXXXXXXX" />
                  <p className="text-xs text-muted-foreground">From Google Search Console → Settings → Ownership verification → HTML tag</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bingVerification">Bing Webmaster Tools Verification</Label>
                  <Input id="bingVerification" value={settings.bingVerification} onChange={(e) => setSettings({ ...settings, bingVerification: e.target.value })} placeholder="msvalidate.01=XXXXXXXX" />
                  <p className="text-xs text-muted-foreground">From Bing Webmaster Tools → Settings → Site verification</p>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 rounded-lg border bg-muted/30">
                <div>
                  <p className="text-sm font-medium">XML Sitemap</p>
                  <p className="text-xs text-muted-foreground">Auto-generates /sitemap.xml — submit to Google Search Console</p>
                </div>
                <button type="button" onClick={() => setSettings({ ...settings, sitemapEnabled: !settings.sitemapEnabled })}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.sitemapEnabled ? "bg-primary" : "bg-gray-300"}`}>
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.sitemapEnabled ? "translate-x-6" : "translate-x-1"}`} />
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Open Graph & Social */}
          <Card>
            <CardHeader>
              <CardTitle>Open Graph & Social Sharing</CardTitle>
              <CardDescription>How your site appears when shared on Facebook, WhatsApp, LinkedIn, etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ogType">OG Type</Label>
                  <Input id="ogType" value={settings.ogType} onChange={(e) => setSettings({ ...settings, ogType: e.target.value })} placeholder="website" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogLocale">OG Locale</Label>
                  <Input id="ogLocale" value={settings.ogLocale} onChange={(e) => setSettings({ ...settings, ogLocale: e.target.value })} placeholder="en_GB" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="ogSiteName">OG Site Name</Label>
                  <Input id="ogSiteName" value={settings.ogSiteName} onChange={(e) => setSettings({ ...settings, ogSiteName: e.target.value })} placeholder="BPR - Bruno Physical Rehabilitation" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="twitterCard">Twitter/X Card Type</Label>
                  <Input id="twitterCard" value={settings.twitterCard} onChange={(e) => setSettings({ ...settings, twitterCard: e.target.value })} placeholder="summary_large_image" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterSite">Twitter/X Site Handle</Label>
                  <Input id="twitterSite" value={settings.twitterSite} onChange={(e) => setSettings({ ...settings, twitterSite: e.target.value })} placeholder="@BrunoPhysical" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="twitterCreator">Twitter/X Creator Handle</Label>
                  <Input id="twitterCreator" value={settings.twitterCreator} onChange={(e) => setSettings({ ...settings, twitterCreator: e.target.value })} placeholder="@BrunoPhysical" />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Open Graph Image</Label>
                <p className="text-xs text-muted-foreground mb-2">Displayed when sharing on social media (recommended: 1200×630px)</p>
                {settings.ogImageUrl ? (
                  <div className="relative inline-block">
                    <img src={settings.ogImageUrl} alt="OG Image" style={{ width: 400, height: 210 }} className="object-cover border rounded" />
                    <Button size="sm" variant="destructive" className="absolute top-2 right-2" onClick={() => removeImage("ogImageUrl")}><X className="h-4 w-4" /></Button>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => openImagePicker("ogImageUrl")}><Upload className="h-4 w-4 mr-2" />Upload OG Image</Button>
                    <AIImageGenerator section="OG Image" defaultPrompt="Professional banner image for a physiotherapy clinic website, 1200x630 social media preview" aspectRatio="16:9" onApply={(url) => setSettings({ ...settings, ogImageUrl: url })} />
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="socialProfilesJson" fieldName="socialProfilesJson" label="Social Profile URLs (for Schema.org sameAs)" context="List all social media profile URLs for this physiotherapy clinic for schema.org sameAs property, as a JSON array of strings" />
                <Textarea id="socialProfilesJson" value={settings.socialProfilesJson} onChange={(e) => setSettings({ ...settings, socialProfilesJson: e.target.value })} placeholder='["https://www.instagram.com/bprrehab", "https://www.facebook.com/bprrehab"]' rows={3} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">JSON array of social profile URLs — used in Schema.org to link your business profiles</p>
              </div>
            </CardContent>
          </Card>

          {/* Google Business Profile */}
          <Card>
            <CardHeader>
              <CardTitle>Google Business Profile</CardTitle>
              <CardDescription>Fill in your business details exactly as they appear on Google Maps. This data is used to generate Schema.org structured data and improve local SEO for Ipswich and surrounding areas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <FieldLabel htmlFor="businessName" fieldName="businessName" label="Business Name" context="Official business name for Google Business Profile of a physiotherapy clinic in Ipswich, Suffolk" />
                  <Input id="businessName" value={settings.businessName} onChange={(e) => setSettings({ ...settings, businessName: e.target.value })} placeholder="BPR - Bruno Physical Rehabilitation" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessType">Business Type (Schema.org)</Label>
                  <Input id="businessType" value={settings.businessType} onChange={(e) => setSettings({ ...settings, businessType: e.target.value })} placeholder="PhysicalTherapist" />
                  <p className="text-xs text-muted-foreground">e.g. PhysicalTherapist, MedicalBusiness, HealthAndBeautyBusiness</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessStreet">Street Address</Label>
                  <Input id="businessStreet" value={settings.businessStreet} onChange={(e) => setSettings({ ...settings, businessStreet: e.target.value })} placeholder="123 Tavern Street" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessPostcode">Postcode</Label>
                  <Input id="businessPostcode" value={settings.businessPostcode} onChange={(e) => setSettings({ ...settings, businessPostcode: e.target.value })} placeholder="IP1 3AA" />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessCity">City</Label>
                  <Input id="businessCity" value={settings.businessCity} onChange={(e) => setSettings({ ...settings, businessCity: e.target.value })} placeholder="Ipswich" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessRegion">Region / County</Label>
                  <Input id="businessRegion" value={settings.businessRegion} onChange={(e) => setSettings({ ...settings, businessRegion: e.target.value })} placeholder="Suffolk" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessCountry">Country Code</Label>
                  <Input id="businessCountry" value={settings.businessCountry} onChange={(e) => setSettings({ ...settings, businessCountry: e.target.value })} placeholder="GB" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessPhone">Business Phone</Label>
                  <Input id="businessPhone" value={settings.businessPhone} onChange={(e) => setSettings({ ...settings, businessPhone: e.target.value })} placeholder="+44 1473 000000" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessEmail">Business Email</Label>
                  <Input id="businessEmail" value={settings.businessEmail} onChange={(e) => setSettings({ ...settings, businessEmail: e.target.value })} placeholder="admin@bpr.rehab" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="businessPriceRange">Price Range</Label>
                  <Input id="businessPriceRange" value={settings.businessPriceRange} onChange={(e) => setSettings({ ...settings, businessPriceRange: e.target.value })} placeholder="££" />
                  <p className="text-xs text-muted-foreground">£, ££, £££ or £££££</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="businessCurrency">Currency</Label>
                  <Input id="businessCurrency" value={settings.businessCurrency} onChange={(e) => setSettings({ ...settings, businessCurrency: e.target.value })} placeholder="GBP" />
                </div>
              </div>
              <div className="space-y-2">
                <FieldLabel htmlFor="businessHoursJson" fieldName="businessHoursJson" label="Opening Hours" context="Generate opening hours JSON for a physiotherapy clinic in Ipswich open every day including weekends, format: [{day:'Monday',open:'09:00',close:'18:00',closed:false}]" />
                <Textarea id="businessHoursJson" value={settings.businessHoursJson} onChange={(e) => setSettings({ ...settings, businessHoursJson: e.target.value })} placeholder='[{"day":"Monday","open":"09:00","close":"18:00","closed":false},...]' rows={4} className="font-mono text-xs" />
              </div>
            </CardContent>
          </Card>

          {/* Local Business / Geo SEO */}
          <Card>
            <CardHeader>
              <CardTitle>Local SEO & Geo Tags</CardTitle>
              <CardDescription>Geo-targeting for local search visibility — "physiotherapy near me", "physio Ipswich", etc.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="geoRegion">Geo Region (ISO 3166)</Label>
                  <Input id="geoRegion" value={settings.geoRegion} onChange={(e) => setSettings({ ...settings, geoRegion: e.target.value })} placeholder="GB-SFK" />
                  <p className="text-xs text-muted-foreground">GB-SFK = Suffolk, GB-LND = London</p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geoPlacename">Place Name</Label>
                  <Input id="geoPlacename" value={settings.geoPlacename} onChange={(e) => setSettings({ ...settings, geoPlacename: e.target.value })} placeholder="Ipswich, Suffolk" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="geoPosition">GPS Coordinates (lat,lng)</Label>
                  <Input id="geoPosition" value={settings.geoPosition} onChange={(e) => setSettings({ ...settings, geoPosition: e.target.value })} placeholder="52.0567,-1.1482" />
                  <p className="text-xs text-muted-foreground">Find on Google Maps → right-click → coordinates</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Schema.org JSON-LD */}
          <Card>
            <CardHeader>
              <CardTitle>Schema.org Structured Data</CardTitle>
              <CardDescription>JSON-LD that Google reads to show rich results, knowledge panels, and local business info. Use AI to auto-generate from your business details above.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="schemaOrgJson">JSON-LD (LocalBusiness / PhysicalTherapist)</Label>
                  <AIFieldHelper
                    fieldName="schemaOrgJson"
                    fieldLabel="Schema.org JSON-LD"
                    currentValue={settings.schemaOrgJson}
                    context={`Generate a complete Schema.org JSON-LD for a PhysicalTherapist / LocalBusiness. Business name: ${settings.businessName || "BPR - Bruno Physical Rehabilitation"}. Address: ${settings.businessStreet || ""} ${settings.businessCity || "Ipswich"}, ${settings.businessRegion || "Suffolk"} ${settings.businessPostcode || ""}. Phone: ${settings.businessPhone || ""}. Email: ${settings.businessEmail || "admin@bpr.rehab"}. Website: https://bpr.rehab. Services: physiotherapy, sports rehabilitation, biomechanical assessment, custom insoles, electrotherapy, shockwave therapy, remote consultations. Open every day including weekends. Output ONLY valid JSON-LD, no markdown, no explanation.`}
                    onApply={(text) => setSettings({ ...settings, schemaOrgJson: text })}
                  />
                </div>
                <Textarea id="schemaOrgJson" value={settings.schemaOrgJson} onChange={(e) => setSettings({ ...settings, schemaOrgJson: e.target.value })} placeholder='{"@context":"https://schema.org","@type":"PhysicalTherapist","name":"BPR - Bruno Physical Rehabilitation",...}' rows={12} className="font-mono text-xs" />
                <p className="text-xs text-muted-foreground">Tip: Click the AI button above to auto-generate from your Google Business Profile fields. Validate at <strong>schema.org/validator</strong></p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Image Gallery Picker Dialog */}
      <ImageGalleryPicker
        open={showImagePicker}
        onOpenChange={setShowImagePicker}
        onSelect={handleImageSelect}
        selectedImageUrl={
          currentImageField ? settings[currentImageField as keyof typeof settings] as string : undefined
        }
      />
    </div>
  );
}
