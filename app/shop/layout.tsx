import { Metadata } from 'next';
import { shopMetadata, shopJsonLd } from './metadata';
import { getSiteSettingsLogo } from '@/lib/get-site-settings';

const BASE_URL = 'https://bpr.clinic';

export async function generateMetadata(): Promise<Metadata> {
  const logoSettings = await getSiteSettingsLogo();
  const rawLogo = logoSettings?.logoUrl;
  const ogImage = rawLogo
    ? (rawLogo.startsWith('http') ? rawLogo : `${BASE_URL}${rawLogo}`)
    : `${BASE_URL}/og-image.png`;

  return {
    ...shopMetadata,
    openGraph: {
      ...shopMetadata.openGraph,
      images: [{ url: ogImage, alt: 'Bruno Physical Rehabilitation' }],
    },
    twitter: {
      ...shopMetadata.twitter,
      images: [ogImage],
    },
  };
}

export default function ShopLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(shopJsonLd) }}
      />
      {children}
    </>
  );
}
