// app/api/agent/instagram/publish/route.ts
// OpenClaw Agent endpoint to publish Instagram posts

import { NextRequest, NextResponse } from 'next/server'
import { requireAgentAuth } from '@/lib/agent-auth'
import { prisma } from '@/lib/prisma'
import { publishToInstagram } from '@/lib/instagram'

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

    // Create post in database
    const post = await prisma.socialPost.create({
      data: {
        platform: 'INSTAGRAM',
        caption,
        imageUrl: imageUrl || null,
        status: scheduleAt ? 'SCHEDULED' : 'DRAFT',
        scheduledFor: scheduleAt ? new Date(scheduleAt) : null,
        metadata: {
          source: 'openclaw_agent',
          agentId: agent.id,
          agentName: agent.name,
        },
      },
    })

    // If no schedule time, publish immediately
    if (!scheduleAt && imageUrl) {
      try {
        const result = await publishToInstagram({
          caption,
          imageUrl,
        })

        await prisma.socialPost.update({
          where: { id: post.id },
          data: {
            status: 'PUBLISHED',
            publishedAt: new Date(),
            metadata: {
              source: 'openclaw_agent',
              agentId: agent.id,
              agentName: agent.name,
              instagramPostId: result.id,
            },
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
            metadata: {
              source: 'openclaw_agent',
              agentId: agent.id,
              agentName: agent.name,
              error: publishError instanceof Error ? publishError.message : 'Unknown error',
            },
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
