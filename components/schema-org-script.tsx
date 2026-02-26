import { prisma } from "@/lib/db";

export async function SchemaOrgScript() {
  const BASE_URL = "https://bpr.rehab";

  let s: any = null;
  try {
    s = await prisma.siteSettings.findFirst();
  } catch {
    // DB unavailable — render nothing
    return null;
  }

  // If admin has provided custom schema.org JSON, use it directly
  if (s?.schemaOrgJson) {
    try {
      const custom = JSON.parse(s.schemaOrgJson);
      return (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(custom) }}
        />
      );
    } catch {}
  }

  // Build schema.org from individual business fields
  const businessName = s?.businessName || s?.siteName || "BPR";
  const businessType = s?.businessType || "PhysicalTherapist";
  const ogImage = s?.ogImageUrl
    ? (s.ogImageUrl.startsWith("http") ? s.ogImageUrl : `${BASE_URL}${s.ogImageUrl}`)
    : `${BASE_URL}/og-image.png`;

  // Parse opening hours
  let openingHours: any[] = [];
  if (s?.businessHoursJson) {
    try {
      const hours = JSON.parse(s.businessHoursJson);
      if (Array.isArray(hours)) {
        openingHours = hours
          .filter((h: any) => h.enabled !== false && h.open && h.close)
          .map((h: any) => ({
            "@type": "OpeningHoursSpecification",
            dayOfWeek: h.day || h.dayOfWeek,
            opens: h.open || h.opens,
            closes: h.close || h.closes,
          }));
      }
    } catch {}
  }

  // Parse social profiles
  let sameAs: string[] = [];
  if (s?.socialProfilesJson) {
    try {
      const profiles = JSON.parse(s.socialProfilesJson);
      if (Array.isArray(profiles)) sameAs = profiles.filter((u: any) => typeof u === "string");
    } catch {}
  }

  const schema: any = {
    "@context": "https://schema.org",
    "@type": businessType,
    name: businessName,
    image: ogImage,
    "@id": BASE_URL,
    url: BASE_URL,
    ...(s?.businessPhone ? { telephone: s.businessPhone } : {}),
    ...(s?.businessEmail ? { email: s.businessEmail } : {}),
    ...(s?.metaDescription ? { description: s.metaDescription } : {}),
    address: {
      "@type": "PostalAddress",
      ...(s?.businessStreet ? { streetAddress: s.businessStreet } : {}),
      ...(s?.businessCity ? { addressLocality: s.businessCity } : {}),
      ...(s?.businessRegion ? { addressRegion: s.businessRegion } : {}),
      ...(s?.businessPostcode ? { postalCode: s.businessPostcode } : {}),
      addressCountry: s?.businessCountry || "GB",
    },
    ...(s?.geoPosition ? (() => {
      const [lat, lng] = s.geoPosition.split(",").map(Number);
      return !isNaN(lat) && !isNaN(lng) ? {
        geo: { "@type": "GeoCoordinates", latitude: lat, longitude: lng },
      } : {};
    })() : {}),
    ...(openingHours.length > 0 ? { openingHoursSpecification: openingHours } : {}),
    ...(sameAs.length > 0 ? { sameAs } : {}),
    medicalSpecialty: "Physiotherapy",
    ...(s?.businessPriceRange ? { priceRange: s.businessPriceRange } : {}),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
