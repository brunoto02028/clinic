import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/db';

// GET - List all active clinics (public endpoint for directory)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const city = searchParams.get('city');
    const postcode = searchParams.get('postcode');
    
    let whereClause: any = { isActive: true };
    
    if (city) {
      whereClause.city = { contains: city, mode: 'insensitive' };
    }
    
    if (postcode) {
      whereClause.postcode = { startsWith: postcode.toUpperCase() };
    }
    
    const clinics = await prisma.clinic.findMany({
      where: whereClause,
      select: {
        id: true,
        name: true,
        slug: true,
        logoUrl: true,
        primaryColor: true,
        secondaryColor: true,
        email: true,
        phone: true,
        address: true,
        city: true,
        postcode: true,
        country: true,
        // Include therapist count
        _count: {
          select: {
            users: {
              where: { role: { in: ['ADMIN', 'THERAPIST'] }, isActive: true }
            }
          }
        }
      },
      orderBy: { name: 'asc' }
    });
    
    // Transform for public consumption
    const publicClinics = clinics.map(clinic => ({
      id: clinic.id,
      name: clinic.name,
      slug: clinic.slug,
      logoUrl: clinic.logoUrl,
      primaryColor: clinic.primaryColor,
      secondaryColor: clinic.secondaryColor,
      contact: {
        email: clinic.email,
        phone: clinic.phone,
        address: clinic.address,
        city: clinic.city,
        postcode: clinic.postcode,
        country: clinic.country
      },
      staffCount: clinic._count.users
    }));
    
    return NextResponse.json(publicClinics);
    
  } catch (error) {
    console.error('Error fetching clinics:', error);
    return NextResponse.json({ error: 'Failed to fetch clinics' }, { status: 500 });
  }
}
