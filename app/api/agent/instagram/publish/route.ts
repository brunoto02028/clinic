// app/api/agent/instagram/publish/route.ts
// OpenClaw Agent endpoint to publish Instagram posts

import { NextRequest, NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent-auth'
import { prisma } from '@/lib/db'
import { publishPhoto } from '@/lib/instagram'

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  const authResult = await requireAgentAuth(request, 'instagram')
  
  if ('error' in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: authResult.status })
  }

  const { agent } = authResult

  try {
    const body = await request.json()
    const { caption, imageUrl, scheduleAt } = body

    if (!caption) {
      return NextResponse.json({ error: 'Caption is required' }, { status: 400 })
    }

    // Get clinic ID (fallback to first active clinic if not provided)
    const clinic = await prisma.clinic.findFirst({
      where: { isActive: true },
      select: { id: true },
    })

    if (!clinic) {
      return NextResponse.json({ error: 'No active clinic found' }, { status: 500 })
    }

    // Create post in database
    const post = await prisma.socialPost.create({
      data: {
        clinic: { connect: { id: clinic.id } },
        caption,
        mediaUrls: imageUrl ? [imageUrl] : [],
        mediaPaths: [],
        status: scheduleAt ? 'SCHEDULED' : 'DRAFT',
        scheduledAt: scheduleAt ? new Date(scheduleAt) : null,
        aiGenerated: true,
        aiPrompt: `OpenClaw Agent: ${agent.name} (${agent.id})`,
      },
    })

    // If no schedule time, publish immediately
    if (!scheduleAt && imageUrl) {
      try {
        const socialAccount = await prisma.socialAccount.findFirst({
          where: {
            clinicId: clinic.id,
            platform: 'INSTAGRAM',
            isActive: true,
          },
          select: {
            accountId: true,
            accessToken: true,
          },
        })

        if (!socialAccount?.accountId || !socialAccount?.accessToken) {
          throw new Error('No active Instagram account configured for publishing')
        }

        const result = await publishPhoto({
          igAccountId: socialAccount.accountId,
          accessToken: socialAccount.accessToken,
          imageUrl,
          caption,
        })

        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            platformPostId: result.id,
          },
        })

        return NextResponse.json({
          success: true,
          post: {
            id: post.id,
            status: 'PUBLISHED',
            instagramPostId: result.id,
          },
        })
      } catch (publishError) {
        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: 'FAILED',
            publishError: publishError instanceof Error ? publishError.message : 'Unknown error',
          },
        })

        return NextResponse.json({
          success: false,
          error: 'Failed to publish to Instagram',
          post: { id: post.id, status: 'FAILED' },
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      success: true,
      post: {
        id: post.id,
        status: scheduleAt ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: scheduleAt,
      },
    })
  } catch (error) {
    console.error('Agent Instagram publish error:', error)
    return NextResponse.json({
      error: 'Failed to create post',
      details: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
