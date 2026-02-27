export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { revalidatePath } from "next/cache";
import { isDbUnreachableError, MOCK_SETTINGS, devFallbackResponse } from "@/lib/dev-fallback";

const DEFAULT_ABOUT_TEXT = `My name is Bruno, and I'm a therapist based in the UK with a strong foundation in physical rehabilitation, sports recovery, and human performance.

Before becoming a therapist, I lived the journey many of my clients now face. I was a professional footballer for over a decade, playing in Brazil, Germany, and Sweden. After undergoing three major knee surgeries, I understand firsthand the physical and emotional challenges of rehabilitation.

This personal experience drives my passion for helping others recover, rebuild, and return to their best selves.`;

const DEFAULT_SERVICES = JSON.stringify([
  { id: "1", title: "Kinesiotherapy", description: "Restore natural movement and improve postural balance through targeted therapeutic exercises." },
  { id: "2", title: "Microcurrent Therapy (MENS)", description: "Support cellular regeneration and tissue healing with advanced microcurrent technology." },
  { id: "3", title: "Laser & Shockwave Therapy", description: "Non-invasive technologies to accelerate recovery, reduce chronic pain, and support advanced musculoskeletal rehabilitation." },
  { id: "4", title: "Electrical Muscle Stimulation (EMS)", description: "Including advanced protocols such as Aussie current and Russian stimulation to enhance neuromuscular activation and strengthen weakened muscles." },
  { id: "5", title: "Therapeutic Ultrasound", description: "1 MHz & 3 MHz frequencies for soft tissue healing, inflammation reduction, and pain relief." },
  { id: "6", title: "Post & Pre-Surgery Rehabilitation", description: "Specialist rehabilitation programmes for optimal recovery before and after orthopaedic surgery." },
  { id: "7", title: "Sports Injury Treatment", description: "Comprehensive assessment and treatment for sports-related injuries, from acute trauma to chronic conditions." },
  { id: "8", title: "Chronic Pain Management", description: "Multi-modal approaches to manage and reduce chronic pain, improving quality of life and function." },
]);

export async function GET() {
  try {
    let settings = await prisma.siteSettings.findFirst();
    
    if (!settings) {
      settings = await prisma.siteSettings.create({
        data: {
          siteName: "Bruno Physical Rehabilitation",
          tagline: "Where Innovation Meets Care",
          
          // Hero Section
          heroTitle: "Adjust Your Body Get A Perfect Balance",
          heroSubtitle: "Expert physical rehabilitation and sports therapy in Richmond, UK. Helping you move better, feel stronger, and live pain-free through evidence-based treatments and personalised care.",
          heroImageUrl: "https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=800&q=80",
          heroCTA: "Book Appointment",
          heroCTALink: "/signup",
          
          // Portal Section
          portalTitle: "Your Rehabilitation Portal",
          portalSubtitle: "Everything you need to manage your recovery journey in one secure place.",
          portalText: "Online Booking: Book your appointment online at a time that suits you.\nDigital Records: Access your treatment history and clinical notes securely.\nMedical Screening: Complete your medical screening online before your first appointment.\nAdvanced Treatments: Access cutting-edge therapies including electrotherapy and shockwave therapy.",
          
          // Services Section
          servicesTitle: "I Specialise In...",
          servicesSubtitle: "Comprehensive rehabilitation services tailored to your individual needs.",
          servicesJson: DEFAULT_SERVICES,
          
          // About Section
          aboutTitle: "Bruno Physical Rehabilitation",
          aboutImageUrl: "https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=600&q=80",
          aboutText: DEFAULT_ABOUT_TEXT,
          
          // Articles Section
          articlesTitle: "Stay Informed. Stay Empowered.",
          articlesSubtitle: "Evidence-based insights to support your rehabilitation journey.",
          
          // Articles Placeholder
          articlesPlaceholderTitle: "Articles Coming Soon",
          articlesPlaceholderText: "We're working on bringing you valuable content about physiotherapy, rehabilitation techniques, and wellness tips. Stay tuned!",
          
          // Contact Section
          contactTitle: "Get in Touch",
          contactSubtitle: "Home visit or our clinic — we're open every day, including weekends.",
          contactText: "Have questions about our services? Ready to book your first appointment? Feel free to reach out to us.",
          phone: "+44 7XXX XXXXXX",
          email: "admin@bpr.rehab",
          address: "The Vineyard, Richmond TW10 6AQ",
          
          // Footer
          footerText: "© 2026 Bruno Physical Rehabilitation. All rights reserved.",
          footerLinksJson: JSON.stringify([]),
          socialLinksJson: JSON.stringify([]),
          
          // SEO
          metaTitle: "Bruno Physical Rehabilitation - Professional Physiotherapy in Richmond",
          metaDescription: "Professional physiotherapy and sports rehabilitation services in Richmond, London. Expert treatment for injuries, chronic pain, and optimal physical performance.",
          metaKeywords: "physiotherapy, sports rehabilitation, Richmond, London, physical therapy, injury treatment, pain management",
        },
      });
    }
    
    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error fetching settings:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse(MOCK_SETTINGS);
    }
    return NextResponse.json(
      { error: "Failed to fetch settings" },
      { status: 500 }
    );
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    const userRole = (session?.user as { role?: string })?.role;
    if (!session || !userRole || !["SUPERADMIN", "ADMIN", "THERAPIST"].includes(userRole)) {
      return NextResponse.json(
        { error: "Unauthorised" },
        { status: 401 }
      );
    }
    
    const body = await request.json();
    
    let settings = await prisma.siteSettings.findFirst();
    
    const data = {
      // Branding
      logoUrl: body.logoUrl || null,
      logoPath: body.logoPath || null,
      darkLogoUrl: body.darkLogoUrl || null,
      darkLogoPath: body.darkLogoPath || null,
      screenLogos: body.screenLogos || undefined,
      faviconUrl: body.faviconUrl || null,
      siteName: body.siteName || "Bruno Physical Rehabilitation",
      tagline: body.tagline || null,
      
      // Menu/Navigation
      navigationJson: body.navigationJson || null,
      
      // Hero Section
      heroTitle: body.heroTitle || null,
      heroSubtitle: body.heroSubtitle || null,
      heroImageUrl: body.heroImageUrl || null,
      heroImagePath: body.heroImagePath || null,
      heroCTA: body.heroCTA || null,
      heroCTALink: body.heroCTALink || null,
      
      // Portal Section
      portalTitle: body.portalTitle || null,
      portalSubtitle: body.portalSubtitle || null,
      portalText: body.portalText || null,
      portalFeaturesJson: body.portalFeaturesJson || null,
      
      // Services Section
      servicesTitle: body.servicesTitle || null,
      servicesSubtitle: body.servicesSubtitle || null,
      servicesJson: body.servicesJson || null,
      
      // About Section
      aboutTitle: body.aboutTitle || null,
      aboutText: body.aboutText || null,
      aboutImageUrl: body.aboutImageUrl || null,
      aboutImagePath: body.aboutImagePath || null,
      
      // Articles Section
      articlesTitle: body.articlesTitle || null,
      articlesSubtitle: body.articlesSubtitle || null,
      
      // Articles Placeholder
      articlesPlaceholderTitle: body.articlesPlaceholderTitle || null,
      articlesPlaceholderText: body.articlesPlaceholderText || null,
      
      // Contact Section
      contactTitle: body.contactTitle || null,
      contactSubtitle: body.contactSubtitle || null,
      contactText: body.contactText || null,
      contactCardsJson: body.contactCardsJson || null,
      phone: body.phone || null,
      email: body.email || null,
      address: body.address || null,
      whatsappNumber: body.whatsappNumber || null,
      whatsappEnabled: body.whatsappEnabled ?? false,
      whatsappMessage: body.whatsappMessage || null,
      
      // Footer
      footerText: body.footerText || null,
      footerLinksJson: body.footerLinksJson || null,
      socialLinksJson: body.socialLinksJson || null,
      footerModulesJson: body.footerModulesJson || null,
      
      // Custom Insoles Block
      insolesTitle: body.insolesTitle || null,
      insolesSubtitle: body.insolesSubtitle || null,
      insolesDesc: body.insolesDesc || null,
      insolesImageUrl: body.insolesImageUrl || null,
      insolesImagePath: body.insolesImagePath || null,
      insolesStepsJson: body.insolesStepsJson || null,
      insolesBenefitsJson: body.insolesBenefitsJson || null,
      
      // Biomechanical Assessment Block
      bioTitle: body.bioTitle || null,
      bioSubtitle: body.bioSubtitle || null,
      bioDesc: body.bioDesc || null,
      bioImageUrl: body.bioImageUrl || null,
      bioImagePath: body.bioImagePath || null,
      bioStepsJson: body.bioStepsJson || null,
      bioBenefitsJson: body.bioBenefitsJson || null,
      
      // MLS® Laser Therapy Block
      mlsLaserJson: body.mlsLaserJson !== undefined ? (body.mlsLaserJson || null) : undefined,

      // Terms of Use page content
      termsContentHtml: body.termsContentHtml !== undefined ? body.termsContentHtml : undefined,
      
      // Landing Pages
      lpTherapiesJson: body.lpTherapiesJson || null,
      lpInsolesJson: body.lpInsolesJson || null,
      lpBiomechanicsJson: body.lpBiomechanicsJson || null,
      
      // SEO - Basic
      metaTitle: body.metaTitle || null,
      metaDescription: body.metaDescription || null,
      metaKeywords: body.metaKeywords || null,
      ogImageUrl: body.ogImageUrl || null,
      ogImagePath: body.ogImagePath || null,
      
      // SEO - Advanced / Technical
      canonicalUrl: body.canonicalUrl || null,
      robotsMeta: body.robotsMeta || null,
      googleVerification: body.googleVerification || null,
      bingVerification: body.bingVerification || null,
      sitemapEnabled: body.sitemapEnabled ?? true,
      robotsTxtCustom: body.robotsTxtCustom || null,
      
      // SEO - Open Graph
      ogType: body.ogType || null,
      ogLocale: body.ogLocale || null,
      ogSiteName: body.ogSiteName || null,
      
      // SEO - Twitter/X
      twitterCard: body.twitterCard || null,
      twitterSite: body.twitterSite || null,
      twitterCreator: body.twitterCreator || null,
      
      // SEO - Schema.org
      schemaOrgJson: body.schemaOrgJson || null,
      socialProfilesJson: body.socialProfilesJson || null,
      
      // SEO - Geo
      geoRegion: body.geoRegion || null,
      geoPlacename: body.geoPlacename || null,
      geoPosition: body.geoPosition || null,
      
      // Google Business Profile
      businessName: body.businessName || null,
      businessType: body.businessType || null,
      businessStreet: body.businessStreet || null,
      businessCity: body.businessCity || null,
      businessRegion: body.businessRegion || null,
      businessPostcode: body.businessPostcode || null,
      businessCountry: body.businessCountry || null,
      businessPhone: body.businessPhone || null,
      businessEmail: body.businessEmail || null,
      businessHoursJson: body.businessHoursJson || null,
      businessPriceRange: body.businessPriceRange || null,
      businessCurrency: body.businessCurrency || null,
    };
    
    if (settings) {
      settings = await prisma.siteSettings.update({
        where: { id: settings.id },
        data,
      });
    } else {
      settings = await prisma.siteSettings.create({
        data,
      });
    }
    
    // Auto-sync: create ServicePage records for any new services in servicesJson
    try {
      const servicesRaw = body.servicesJson || data.servicesJson;
      if (servicesRaw) {
        const services: { id: string; title: string; description?: string; icon?: string }[] = JSON.parse(servicesRaw);
        const existingPages = await (prisma as any).servicePage.findMany({ select: { titleEn: true, slug: true } });
        const existingSlugs = new Set(existingPages.map((p: any) => p.slug));
        const existingTitles = new Set(existingPages.map((p: any) => p.titleEn.toLowerCase()));

        const maxOrder = await (prisma as any).servicePage.aggregate({ _max: { sortOrder: true } });
        let nextOrder = (maxOrder._max.sortOrder ?? -1) + 1;

        for (const svc of services) {
          const slug = svc.title
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/(^-|-$)/g, "");

          if (existingSlugs.has(slug) || existingTitles.has(svc.title.toLowerCase())) continue;

          await (prisma as any).servicePage.create({
            data: {
              slug,
              icon: svc.icon || "Zap",
              color: "bg-primary/10 text-primary",
              titleEn: svc.title,
              titlePt: svc.title,
              descriptionEn: svc.description || null,
              descriptionPt: svc.description || null,
              published: true,
              showInMenu: true,
              sortOrder: nextOrder++,
            },
          });
        }
      }
    } catch (syncErr) {
      console.warn("Service pages sync warning:", syncErr);
    }

    // Revalidate all pages so changes go live instantly for every visitor
    try {
      revalidatePath("/", "layout");
    } catch (e) {
      console.warn("Revalidation warning:", e);
    }

    return NextResponse.json(settings);
  } catch (error) {
    console.error("Error updating settings:", error);
    if (isDbUnreachableError(error)) {
      return devFallbackResponse({ ...MOCK_SETTINGS, _devNote: "Changes saved locally (dev mode)" });
    }
    return NextResponse.json(
      { error: "Failed to update settings" },
      { status: 500 }
    );
  }
}
