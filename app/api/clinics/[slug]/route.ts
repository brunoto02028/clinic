import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - Get clinic by slug (public endpoint)
export async function GET(
  request: NextRequest,
  { params }: { params: { slug: string } }
) {
  try {
    const { slug } = params;
    
    const clinic = await prisma.clinic.findUnique({
      where: { slug },
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
        subscription: {
          select: {
            plan: true,
            status: true
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
      return NextResponse.json({ error: 'Clinic not found' }, { status: 404 });
    }
    
    // Transform for public page
    const publicClinic = {
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      branding: {
        logoUrl: clinic.logoUrl,
        primaryColor: clinic.primaryColor,
        secondaryColor: clinic.secondaryColor
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
        servicesJson: clinic.siteSettings.servicesJson,
        metaTitle: clinic.siteSettings.metaTitle,
        metaDescription: clinic.siteSettings.metaDescription
      } : null,
      team: clinic.users.map(user => ({
        id: user.id,
        name: `${user.firstName} ${user.lastName}`,
        role: user.role,
        imageUrl: user.profileImageUrl
      })),
      articles: clinic.articles,
      subscriptionPlan: clinic.subscription?.plan
    };
    
    return NextResponse.json(publicClinic);
    
  } catch (error) {
    console.error('Error fetching clinic:', error);
    return NextResponse.json({ error: 'Failed to fetch clinic' }, { status: 500 });
  }
}
