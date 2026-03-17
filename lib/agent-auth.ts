// lib/agent-auth.ts
// Authentication middleware for OpenClaw Agent API access

import { prisma } from '@/lib/db'
import { NextRequest } from 'next/server'

export interface AgentPermissions {
  instagram: boolean
  leads: boolean
  patients: boolean
  appointments: boolean
  analytics: boolean
}

export interface ValidatedAgent {
  id: string
  name: string
  permissions: AgentPermissions
}

/**
 * Validate API Key from request headers
 * Usage: const agent = await validateAgentApiKey(request)
 */
export async function validateAgentApiKey(
  request: NextRequest
): Promise<ValidatedAgent | null> {
  const authHeader = request.headers.get('authorization')
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }

  const apiKey = authHeader.substring(7) // Remove "Bearer "

  try {
    const agentKey = await prisma.agentApiKey.findUnique({
      where: { key: apiKey },
      select: {
        id: true,
        name: true,
        permissions: true,
        expiresAt: true,
        isActive: true,
      },
    })

    if (!agentKey || !agentKey.isActive) {
      return null
    }

    // Check expiration
    if (agentKey.expiresAt && agentKey.expiresAt < new Date()) {
      return null
    }

    // Update last used timestamp (async, don't wait)
    prisma.agentApiKey.update({
      where: { id: agentKey.id },
      data: { lastUsedAt: new Date() },
    }).catch(() => {}) // Ignore errors on lastUsedAt update

    return {
      id: agentKey.id,
      name: agentKey.name,
      permissions: agentKey.permissions as AgentPermissions,
    }
  } catch (error) {
    console.error('Agent API Key validation error:', error)
    return null
  }
}

/**
 * Check if agent has specific permission
 */
export function hasPermission(
  agent: ValidatedAgent,
  permission: keyof AgentPermissions
): boolean {
  return agent.permissions[permission] === true
}

/**
 * Generate a secure random API key
 */
export function generateApiKey(): string {
  const prefix = 'bpr_agent_'
  const randomBytes = crypto.getRandomValues(new Uint8Array(32))
  const randomString = Array.from(randomBytes)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
  return prefix + randomString
}

/**
 * Middleware helper for protected agent routes
 */
export async function requireAgentAuth(
  request: NextRequest,
  requiredPermission?: keyof AgentPermissions
): Promise<{ agent: ValidatedAgent } | { error: string; status: number }> {
  const agent = await validateAgentApiKey(request)

  if (!agent) {
    return { error: 'Invalid or missing API key', status: 401 }
  }

  if (requiredPermission && !hasPermission(agent, requiredPermission)) {
    return { error: `Permission denied: ${requiredPermission} access required`, status: 403 }
  }

  return { agent }
}
