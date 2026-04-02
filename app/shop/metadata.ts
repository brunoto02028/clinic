import { Metadata } from 'next';

export const shopMetadata: Metadata = {
  title: '3D Printed Foot Care Products | BPR Rehab Shop',
  description: 'Clinically designed 3D printed foot care products. Toe spacers, arch supports, heel lifts, and custom insoles for plantar fasciitis, bunions, and daily comfort. Made in-house by Bruno Physical Rehabilitation.',
  keywords: [
    '3D printed insoles',
    'custom foot support',
    'toe spacers',
    'arch support',
    'heel lift',
    'plantar fasciitis support',
    'bunion relief',
    'foot care products',
    'orthotic accessories',
    'rehabilitation products',
    'foot massage tools',
    'metatarsal support',
    'clinical foot care',
    'printed orthotics',
    'recovery products'
  ],
  openGraph: {
    title: '3D Printed Foot Care Products | BPR Rehab Shop',
    description: 'Clinically designed 3D printed foot care products for plantar fasciitis, bunions, and daily comfort. Made in-house by Bruno Physical Rehabilitation.',
    url: 'https://bpr.rehab/shop',
    siteName: 'BPR Rehab',
    images: [
      {
        url: 'https://bpr.rehab/og-shop.jpg',
        width: 1200,
        height: 630,
        alt: 'BPR 3D Printed Foot Care Products',
      },
    ],
    locale: 'en_GB',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: '3D Printed Foot Care Products | BPR Rehab',
    description: 'Clinically designed 3D printed foot care for plantar fasciitis, bunions, and daily comfort.',
    images: ['https://bpr.rehab/og-shop.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://bpr.rehab/shop',
  },
};

export const shopJsonLd = {
  '@context': 'https://schema.org',
  '@type': 'Store',
  name: 'BPR Rehab Shop',
  description: 'Clinically designed 3D printed foot care products',
  url: 'https://bpr.rehab/shop',
  logo: 'https://bpr.rehab/logo.png',
  image: 'https://bpr.rehab/og-shop.jpg',
  priceRange: '£15-£150',
  address: {
    '@type': 'PostalAddress',
    addressCountry: 'GB',
  },
  hasOfferCatalog: {
    '@type': 'OfferCatalog',
    name: '3D Printed Foot Care Products',
    itemListElement: [
      {
        '@type': 'OfferCatalog',
        name: 'Toe Spacers & Support',
        description: '3D printed toe spacers for bunion relief and daily comfort',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Arch & Heel Support',
        description: 'Custom arch supports and heel lifts for plantar fasciitis and comfort',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Recovery Kits',
        description: 'Complete foot recovery kits with multiple support products',
      },
      {
        '@type': 'OfferCatalog',
        name: 'Custom Insoles',
        description: 'Personalized 3D printed insoles based on clinical assessment',
      },
    ],
  },
};
