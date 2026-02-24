import { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { prisma } from '@/lib/db';
import ClinicPageClient from './client';

interface PageProps {
  params: { slug: string };
}

// Generate metadata for SEO
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const clinic = await prisma.clinic.findUnique({
    where: { slug: params.slug },
    include: { siteSettings: true }
  });
  
  if (!clinic) {
    return {
      title: 'Clinic Not Found',
      description: 'The requested clinic could not be found.'
    };
  }
  
  const title = clinic.siteSettings?.metaTitle || 
    `${clinic.name} | Physiotherapy & Sports Rehabilitation`;
  const description = clinic.siteSettings?.metaDescription || 
    `Professional physiotherapy and sports rehabilitation services at ${clinic.name} in ${clinic.city || 'your area'}. Book your appointment today.`;
  
  return {
    title,
    description,
    keywords: [
      'physiotherapy',
      'sports rehabilitation',
      'physical therapy',
      clinic.city || '',
      clinic.postcode || '',
      'foot scan',
      'biomechanics'
    ].filter(Boolean),
    openGraph: {
      title,
      description,
      type: 'website',
      locale: 'en_GB',
      images: clinic.siteSettings?.heroImageUrl ? [
        { url: clinic.siteSettings.heroImageUrl }
      ] : undefined
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  };
}

// Force dynamic rendering — no static pre-generation at build time
export const dynamic = 'force-dynamic';

export default async function ClinicPage({ params }: PageProps) {
  const clinic = await prisma.clinic.findUnique({
    where: { slug: params.slug },
    include: {
      siteSettings: true,
      users: {
        where: { 
          role: { in: ['ADMIN', 'THERAPIST'] }, 
          isActive: true 
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          role: true,
          profileImageUrl: true
        }
      },
      articles: {
        where: { published: true },
        select: {
          id: true,
          title: true,
          slug: true,
          excerpt: true,
          imageUrl: true,
          createdAt: true
        },
        orderBy: { createdAt: 'desc' },
        take: 6
      }
    }
  });
  
  if (!clinic || !clinic.isActive) {
    notFound();
  }
  
  // Transform for client component
  const clinicData = {
    id: clinic.id,
    name: clinic.name,
    slug: clinic.slug,
    branding: {
      logoUrl: clinic.logoUrl,
      primaryColor: clinic.primaryColor || '#607d7d',
      secondaryColor: clinic.secondaryColor || '#5dc9c0'
    },
    contact: {
      email: clinic.email,
      phone: clinic.phone,
      address: clinic.address,
      city: clinic.city,
      postcode: clinic.postcode,
      country: clinic.country
    },
    settings: clinic.siteSettings ? {
      siteName: clinic.siteSettings.siteName,
      tagline: clinic.siteSettings.tagline,
      heroTitle: clinic.siteSettings.heroTitle,
      heroSubtitle: clinic.siteSettings.heroSubtitle,
      heroImageUrl: clinic.siteSettings.heroImageUrl,
      aboutTitle: clinic.siteSettings.aboutTitle,
      aboutText: clinic.siteSettings.aboutText,
      aboutImageUrl: clinic.siteSettings.aboutImageUrl,
      servicesJson: clinic.siteSettings.servicesJson
    } : null,
    team: clinic.users.map(user => ({
      id: user.id,
      name: `${user.firstName} ${user.lastName}`,
      role: user.role,
      imageUrl: user.profileImageUrl
    })),
    articles: clinic.articles.map(article => ({
      ...article,
      publishedAt: article.createdAt.toISOString()
    }))
  };
  
  return <ClinicPageClient clinic={clinicData} />;
}
