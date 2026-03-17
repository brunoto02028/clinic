// app/api/agent/leads/route.ts
// OpenClaw Agent endpoint to fetch new leads/contacts

import { NextRequest, NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const authResult = await requireAgentAuth(request, 'leads')
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  try {
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const status = searchParams.get('status') // 'new', 'contacted', 'converted'
    const daysAgo = parseInt(searchParams.get('daysAgo') || '7')

    const dateFilter = new Date()
    dateFilter.setDate(dateFilter.getDate() - daysAgo)

    const where: any = {
      createdAt: { gte: dateFilter },
    }

    // Filter by profile completion status (new leads are those who haven't completed profile)
    if (status === 'new') {
      where.profileCompleted = false
      where.emailVerified = null
    } else if (status === 'contacted') {
      where.profileCompleted = false
      where.emailVerified = { not: null }
    } else if (status === 'converted') {
      where.profileCompleted = true
    }

    const leads = await prisma.user.findMany({
      where,
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        createdAt: true,
        emailVerified: true,
        profileCompleted: true,
        role: true,
        patientAppointments: {
          select: {
            id: true,
            startTime: true,
            status: true,
          },
          take: 1,
          orderBy: { startTime: 'desc' },
        },
      },
    })

    const formattedLeads = leads.map(lead => ({
      id: lead.id,
      email: lead.email,
      name: `${lead.firstName} ${lead.lastName}`,
      phone: lead.phone,
      createdAt: lead.createdAt,
      status: lead.profileCompleted 
        ? 'converted' 
        : lead.emailVerified 
          ? 'contacted' 
          : 'new',
      hasAppointment: lead.patientAppointments.length > 0,
      lastAppointment: lead.patientAppointments[0] || null,
    }))

    return NextResponse.json({
      leads: formattedLeads,
      total: formattedLeads.length,
      filters: {
        limit,
        status,
        daysAgo,
      },
    })
  } catch (error) {
    console.error('Agent leads fetch error:', error)
    return NextResponse.json({
      error: 'Failed to fetch leads',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
