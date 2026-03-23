// app/api/admin/agent-keys/route.ts
// Admin API to manage OpenClaw Agent API Keys

import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import { generateApiKey } from '@/lib/agent-auth'

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const keys = await prisma.agentApiKey.findMany({
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
        createdAt: true,
        createdBy: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json({ keys })
  } catch (error) {
    console.error('Error fetching agent keys:', error)
    return NextResponse.json({ error: 'Failed to fetch keys' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { name, permissions, expiresInDays } = body

    if (!name || !permissions) {
      return NextResponse.json({ error: 'Name and permissions required' }, { status: 400 })
    }

    const apiKey = generateApiKey()
    
    const expiresAt = expiresInDays 
      ? new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)
      : null

    const newKey = await prisma.agentApiKey.create({
      data: {
        name,
        key: apiKey,
        permissions,
        expiresAt,
        createdById: session.user.id,
      },
      select: {
        id: true,
        name: true,
        key: true,
        permissions: true,
        isActive: true,
        expiresAt: true,
        createdAt: true,
      },
    })

    return NextResponse.json({ key: newKey })
  } catch (error) {
    console.error('Error creating agent key:', error)
    return NextResponse.json({ error: 'Failed to create key' }, { status: 500 })
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { id, isActive, name, permissions } = body

    if (!id) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
    }

    const updateData: any = {}
    if (typeof isActive === 'boolean') updateData.isActive = isActive
    if (name) updateData.name = name
    if (permissions) updateData.permissions = permissions

    const updatedKey = await prisma.agentApiKey.update({
      where: { id },
      data: updateData,
      select: {
        id: true,
        name: true,
        permissions: true,
        isActive: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    })

    return NextResponse.json({ key: updatedKey })
  } catch (error) {
    console.error('Error updating agent key:', error)
    return NextResponse.json({ error: 'Failed to update key' }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'Key ID required' }, { status: 400 })
    }

    await prisma.agentApiKey.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting agent key:', error)
    return NextResponse.json({ error: 'Failed to delete key' }, { status: 500 })
  }
}
