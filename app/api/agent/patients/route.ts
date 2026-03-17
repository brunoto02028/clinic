// app/api/agent/patients/route.ts
// OpenClaw Agent endpoint to fetch patient data

import { NextRequest, NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await requireAgentAuth(request, 'patients')
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '100')
    const search = searchParams.get('search') || ''
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const where: any = {
      role: 'PATIENT',
    }

    if (!includeInactive) {
      where.isActive = true
    }

    if (search) {
      where.OR = [
        { email: { contains: search, mode: 'insensitive' } },
        { firstName: { contains: search, mode: 'insensitive' } },
        { lastName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search } },
      ]
    }

    const patients = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        dateOfBirth: true,
        address: true,
        createdAt: true,
        isActive: true,
        profileCompleted: true,
        patientAppointments: {
          select: {
            id: true,
            startTime: true,
            status: true,
            therapist: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
          take: 5,
        },
        _count: {
          select: {
            patientAppointments: true,
          },
        },
      },
    })

    const formattedPatients = patients.map(patient => ({
      id: patient.id,
      email: patient.email,
      name: `${patient.firstName} ${patient.lastName}`,
      phone: patient.phone,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      createdAt: patient.createdAt,
      isActive: patient.isActive,
      profileCompleted: patient.profileCompleted,
      totalAppointments: patient._count.patientAppointments,
      recentAppointments: patient.patientAppointments.map(apt => ({
        id: apt.id,
        date: apt.startTime,
        status: apt.status,
        therapist: `${apt.therapist.firstName} ${apt.therapist.lastName}`,
      })),
    }))

    return NextResponse.json({
      patients: formattedPatients,
      total: formattedPatients.length,
      filters: {
        limit,
        search,
        includeInactive,
      },
    })
  } catch (error) {
    console.error('Agent patients fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch patients',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
