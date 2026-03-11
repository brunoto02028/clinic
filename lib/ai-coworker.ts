// lib/ai-coworker.ts
// AI Co-Worker engine — Claude executes tasks with system context
import { claudeGenerate } from '@/lib/claude'
import { prisma } from '@/lib/db'

const SYSTEM_PROMPT = `You are BPR AI Co-Worker — an autonomous AI assistant embedded in the BPR physiotherapy clinic management system.

You have full READ access to the clinic database and can help with:
- Patient communication (drafting emails, WhatsApp messages, follow-ups)
- Data analysis (patient stats, appointment trends, revenue insights)
- Task execution (generating content, analyzing feedback, organizing emails)
- Reporting (weekly summaries, patient retention, treatment outcomes)

IMPORTANT RULES:
1. Always respond in JSON format when executing tasks
2. For emails/messages, include: { "action": "send_email"|"send_whatsapp", "recipients": [...], "subject": "...", "body": "..." }
3. For reports, include: { "action": "report", "title": "...", "data": {...}, "summary": "..." }
4. For analysis, include: { "action": "analysis", "findings": [...], "recommendations": [...] }
5. Be professional, empathetic with patients, and data-driven
6. Clinic locations: Richmond (TW10 6AQ) and Ipswich, Suffolk
7. Website: bpr.rehab
8. Never share patient data externally
9. Use British English for UK patients, Portuguese for Brazilian patients
`

export type TaskType = 'EMAIL_FOLLOWUP' | 'SOCIAL_POST' | 'REPORT' | 'EMAIL_CHECK' | 'PATIENT_OUTREACH' | 'CUSTOM'

interface TaskContext {
  taskId?: string
  taskType: TaskType | string
  prompt: string
  config?: Record<string, unknown>
}

interface TaskResult {
  success: boolean
  output: string
  action?: string
  data?: Record<string, unknown>
  durationMs: number
}

/**
 * Gather system context for Claude — real data from the DB
 */
async function gatherSystemContext(taskType: string, config?: Record<string, unknown>): Promise<string> {
  const contextParts: string[] = []
  const now = new Date()

  try {
    // Always include basic stats
    const [patientCount, appointmentCount, todayAppointments] = await Promise.all([
      prisma.user.count({ where: { role: 'PATIENT', isActive: true } }),
      prisma.appointment.count({ where: { status: 'CONFIRMED', dateTime: { gte: now } } }),
      prisma.appointment.count({
        where: {
          dateTime: {
            gte: new Date(now.getFullYear(), now.getMonth(), now.getDate()),
            lt: new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1),
          },
        },
      }),
    ])

    contextParts.push(`SYSTEM STATUS (${now.toISOString().split('T')[0]}):`)
    contextParts.push(`- Active patients: ${patientCount}`)
    contextParts.push(`- Upcoming appointments: ${appointmentCount}`)
    contextParts.push(`- Today's appointments: ${todayAppointments}`)

    // Task-specific context
    if (taskType === 'EMAIL_FOLLOWUP' || taskType === 'PATIENT_OUTREACH') {
      const targetDays = (config?.targetDays as number) || 30
      const cutoff = new Date(now.getTime() - targetDays * 24 * 60 * 60 * 1000)

      // Patients who had appointments before cutoff but none after
      const inactivePatients = await prisma.user.findMany({
        where: {
          role: 'PATIENT',
          isActive: true,
          patientAppointments: {
            some: { dateTime: { lt: cutoff } },
            none: { dateTime: { gte: cutoff } },
          },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          preferredLocale: true,
          patientAppointments: {
            orderBy: { dateTime: 'desc' },
            take: 1,
            select: { dateTime: true, treatmentType: true },
          },
        },
        take: (config?.maxPatients as number) || 20,
      })

      contextParts.push(`\nINACTIVE PATIENTS (no visit in ${targetDays}+ days): ${inactivePatients.length}`)
      for (const p of inactivePatients) {
        const lastAppt = p.patientAppointments[0]
        contextParts.push(
          `- ${p.firstName} ${p.lastName} (${p.email || 'no email'}, ${p.preferredLocale}) — last visit: ${lastAppt?.dateTime.toISOString().split('T')[0] || 'unknown'}, treatment: ${lastAppt?.treatmentType || 'unknown'}`
        )
      }
    }

    if (taskType === 'REPORT') {
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
      const [completedAppts, newPatients] = await Promise.all([
        prisma.appointment.count({ where: { status: 'COMPLETED', dateTime: { gte: thirtyDaysAgo } } }),
        prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: thirtyDaysAgo } } }),
      ])

      contextParts.push(`\nLAST 30 DAYS:`)
      contextParts.push(`- Completed appointments: ${completedAppts}`)
      contextParts.push(`- New patients: ${newPatients}`)
    }

  } catch (err) {
    contextParts.push(`[Context gathering error: ${err instanceof Error ? err.message : 'unknown'}]`)
  }

  return contextParts.join('\n')
}

/**
 * Send notification after task execution
 * Config format in task.config: { notifyChannels: ["email","whatsapp","sms","in_app"], notifyEmail: "...", notifyPhone: "..." }
 */
async function sendTaskNotification(taskName: string, status: 'SUCCESS' | 'FAILED', outputSummary: string, config?: Record<string, unknown>) {
  if (!config) return
  const channels = (config.notifyChannels as string[]) || []
  if (channels.length === 0) return

  const subject = `AI Co-Worker: ${taskName} — ${status}`
  const shortOutput = outputSummary.substring(0, 500)

  for (const ch of channels) {
    try {
      if (ch === 'email') {
        const toEmail = (config.notifyEmail as string) || process.env.ADMIN_EMAIL || 'brunotoaz@gmail.com'
        const { sendEmail } = await import('@/lib/email')
        await sendEmail({
          to: toEmail,
          subject,
          html: `<div style="font-family:sans-serif;max-width:600px;">
            <h3 style="color:${status === 'SUCCESS' ? '#10b981' : '#ef4444'};">${subject}</h3>
            <p style="font-size:13px;color:#64748b;">Task executed at ${new Date().toLocaleString()}</p>
            <div style="background:#f1f5f9;border-radius:8px;padding:12px;margin:12px 0;">
              <pre style="white-space:pre-wrap;font-size:12px;color:#334155;">${shortOutput}</pre>
            </div>
            <p style="font-size:11px;color:#94a3b8;">— BPR AI Co-Worker</p>
          </div>`,
        })
      }

      if (ch === 'whatsapp') {
        const phone = (config.notifyPhone as string)
        if (phone) {
          const { sendWhatsAppMessage } = await import('@/lib/whatsapp')
          await sendWhatsAppMessage({ to: phone, message: `${subject}\n\n${shortOutput.substring(0, 200)}` })
        }
      }

      if (ch === 'sms') {
        const phone = (config.notifyPhone as string)
        if (phone) {
          const { getConfigValue } = await import('@/lib/system-config')
          const sid = await getConfigValue('TWILIO_ACCOUNT_SID')
          const token = await getConfigValue('TWILIO_AUTH_TOKEN')
          const from = await getConfigValue('TWILIO_PHONE_NUMBER')
          if (sid && token && from) {
            await fetch(`https://api.twilio.com/2010-04-01/Accounts/${sid}/Messages.json`, {
              method: 'POST',
              headers: { Authorization: 'Basic ' + Buffer.from(`${sid}:${token}`).toString('base64'), 'Content-Type': 'application/x-www-form-urlencoded' },
              body: new URLSearchParams({ To: phone, From: from, Body: `${subject}\n${shortOutput.substring(0, 140)}` }),
            })
          }
        }
      }

      // in_app: logged as a CoWorkerLog entry (already done in executeTask)
    } catch (notifyErr) {
      console.error(`[coworker] Notification via ${ch} failed:`, notifyErr)
    }
  }
}

/**
 * Execute a Co-Worker task
 */
export async function executeTask(ctx: TaskContext): Promise<TaskResult> {
  const startTime = Date.now()

  try {
    // Gather real system data
    const systemContext = await gatherSystemContext(ctx.taskType, ctx.config)

    const fullPrompt = `${systemContext}\n\n---\n\nTASK: ${ctx.prompt}`

    const output = await claudeGenerate(
      [{ role: 'user', content: fullPrompt }],
      {
        temperature: 0.4,
        maxTokens: 4096,
        systemPrompt: SYSTEM_PROMPT,
      }
    )

    const durationMs = Date.now() - startTime

    // Try to parse action from output
    let action: string | undefined
    let data: Record<string, unknown> | undefined
    try {
      const jsonMatch = output.match(/\{[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        action = parsed.action
        data = parsed
      }
    } catch {}

    // Log execution
    if (ctx.taskId) {
      await prisma.coWorkerLog.create({
        data: {
          taskId: ctx.taskId,
          type: 'TASK_RUN',
          status: 'SUCCESS',
          input: ctx.prompt.substring(0, 2000),
          output: output.substring(0, 5000),
          metadata: data ? (data as any) : undefined,
          durationMs,
        },
      }).catch(() => null)

      // Update task
      await prisma.coWorkerTask.update({
        where: { id: ctx.taskId },
        data: { lastRunAt: new Date(), runCount: { increment: 1 } },
      }).catch(() => null)
    }

    // Send notifications
    await sendTaskNotification(ctx.taskType, 'SUCCESS', output, ctx.config).catch(() => null)

    return { success: true, output, action, data, durationMs }

  } catch (err) {
    const durationMs = Date.now() - startTime
    const errorMsg = err instanceof Error ? err.message : 'Unknown error'

    // Log error
    if (ctx.taskId) {
      await prisma.coWorkerLog.create({
        data: {
          taskId: ctx.taskId,
          type: 'ERROR',
          status: 'FAILED',
          input: ctx.prompt.substring(0, 2000),
          output: errorMsg,
          durationMs,
        },
      }).catch(() => null)
    }

    // Send failure notification
    await sendTaskNotification(ctx.taskType, 'FAILED', errorMsg, ctx.config).catch(() => null)

    return { success: false, output: errorMsg, durationMs }
  }
}

/**
 * Chat with the Co-Worker — freeform conversation with system context
 */
export async function coworkerChat(message: string, history: Array<{ role: 'user' | 'assistant'; content: string }> = []): Promise<{ reply: string; durationMs: number }> {
  const startTime = Date.now()

  const systemContext = await gatherSystemContext('CUSTOM')

  const messages = [
    ...history,
    { role: 'user' as const, content: `${systemContext}\n\n---\n\n${message}` },
  ]

  const reply = await claudeGenerate(messages, {
    temperature: 0.6,
    maxTokens: 4096,
    systemPrompt: SYSTEM_PROMPT.replace(
      'Always respond in JSON format when executing tasks',
      'Respond naturally in conversation. Use JSON only when the user asks for structured data or actions'
    ),
  })

  const durationMs = Date.now() - startTime

  // Log chat
  await prisma.coWorkerLog.create({
    data: {
      type: 'CHAT',
      status: 'SUCCESS',
      input: message.substring(0, 2000),
      output: reply.substring(0, 5000),
      durationMs,
    },
  }).catch(() => null)

  return { reply, durationMs }
}

/**
 * Suggest tasks — Claude analyses the full system and recommends automations
 */
export async function suggestTasks(): Promise<{ suggestions: Array<{ name: string; type: TaskType; description: string; prompt: string; schedule: string; priority: 'high' | 'medium' | 'low'; reason: string; requiresApproval: boolean }>; durationMs: number }> {
  const startTime = Date.now()

  // Gather deep context
  const now = new Date()
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000)

  const [
    totalPatients,
    activePatients,
    inactiveCount,
    upcomingAppts,
    completedThisMonth,
    newPatientsMonth,
    socialPosts,
    existingTasks,
  ] = await Promise.all([
    prisma.user.count({ where: { role: 'PATIENT' } }),
    prisma.user.count({ where: { role: 'PATIENT', isActive: true } }),
    prisma.user.count({
      where: {
        role: 'PATIENT', isActive: true,
        patientAppointments: { some: { dateTime: { lt: thirtyDaysAgo } }, none: { dateTime: { gte: thirtyDaysAgo } } },
      },
    }),
    prisma.appointment.count({ where: { status: 'CONFIRMED', dateTime: { gte: now } } }),
    prisma.appointment.count({ where: { status: 'COMPLETED', dateTime: { gte: thirtyDaysAgo } } }),
    prisma.user.count({ where: { role: 'PATIENT', createdAt: { gte: thirtyDaysAgo } } }),
    prisma.socialPost.count().catch(() => 0),
    prisma.coWorkerTask.findMany({ where: { isActive: true }, select: { name: true, type: true } }),
  ])

  const deepContext = `SYSTEM ANALYSIS FOR TASK SUGGESTIONS:
Date: ${now.toISOString().split('T')[0]}
Total patients: ${totalPatients} (active: ${activePatients})
Inactive patients (30+ days no visit): ${inactiveCount}
Upcoming appointments: ${upcomingAppts}
Completed appointments (30 days): ${completedThisMonth}
New patients (30 days): ${newPatientsMonth}
Social media posts total: ${socialPosts}
Currently active AI tasks: ${existingTasks.length} (${existingTasks.map(t => t.name).join(', ') || 'none'})

CLINIC SERVICES: MLS Laser Therapy, Custom Insoles, Biomechanical Assessment, Thermography, Sports Recovery, Exercise Therapy, Shockwave, Foot Scans
LOCATIONS: Richmond (TW10 6AQ), Ipswich (Suffolk)
WEBSITE: bpr.rehab`

  const suggestPrompt = `Based on the system data above, suggest 4-6 NEW automated tasks that would benefit this clinic.
Consider what's NOT already being done by existing tasks.

Focus on:
- Patient retention and re-engagement
- Marketing and social media automation
- Clinical workflow improvements
- Revenue opportunities
- Patient experience enhancements

Return ONLY valid JSON:
{
  "suggestions": [
    {
      "name": "Task Name",
      "type": "EMAIL_FOLLOWUP|SOCIAL_POST|REPORT|PATIENT_OUTREACH|CUSTOM",
      "description": "What this task does",
      "prompt": "The full prompt for Claude to execute this task",
      "schedule": "cron expression (e.g. 0 9 * * 1-5)",
      "priority": "high|medium|low",
      "reason": "Why this task would help based on the data",
      "requiresApproval": true/false
    }
  ]
}`

  const output = await claudeGenerate(
    [{ role: 'user', content: `${deepContext}\n\n${suggestPrompt}` }],
    { temperature: 0.5, maxTokens: 4096, systemPrompt: SYSTEM_PROMPT }
  )

  const durationMs = Date.now() - startTime

  // Parse suggestions
  let suggestions: any[] = []
  try {
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      suggestions = parsed.suggestions || []
    }
  } catch {}

  // Log
  await prisma.coWorkerLog.create({
    data: { type: 'TASK_RUN', status: 'SUCCESS', input: 'Suggest Tasks (system analysis)', output: output.substring(0, 5000), durationMs },
  }).catch(() => null)

  return { suggestions, durationMs }
}

/**
 * Create a task from chat — Claude parses natural language into a structured task
 */
export async function createTaskFromChat(userMessage: string): Promise<{ task: { name: string; type: TaskType; description: string; prompt: string; schedule: string; requiresApproval: boolean } | null; reply: string; durationMs: number }> {
  const startTime = Date.now()

  const parsePrompt = `The user wants to create an automated task. Parse their request into a structured task.

User request: "${userMessage}"

Return ONLY valid JSON:
{
  "task": {
    "name": "Short task name",
    "type": "EMAIL_FOLLOWUP|SOCIAL_POST|REPORT|PATIENT_OUTREACH|CUSTOM",
    "description": "What this task does",
    "prompt": "Detailed prompt for Claude to execute this task each time it runs",
    "schedule": "cron expression (e.g. '0 9 * * 1' for Monday 9am, '0 8 * * *' for daily 8am, '' for manual only)",
    "requiresApproval": true
  },
  "reply": "Friendly confirmation message to the user explaining what was created"
}

If you cannot parse a valid task, return: { "task": null, "reply": "explanation of what's unclear" }`

  const output = await claudeGenerate(
    [{ role: 'user', content: parsePrompt }],
    { temperature: 0.3, maxTokens: 2048, systemPrompt: SYSTEM_PROMPT }
  )

  const durationMs = Date.now() - startTime

  try {
    const jsonMatch = output.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return { task: parsed.task, reply: parsed.reply || 'Task parsed.', durationMs }
    }
  } catch {}

  return { task: null, reply: 'Could not parse a task from that. Please be more specific.', durationMs }
}

/**
 * Get task templates for quick setup
 */
export function getTaskTemplates(): Array<{
  name: string
  type: TaskType
  description: string
  prompt: string
  schedule: string
  config: Record<string, unknown>
  requiresApproval: boolean
}> {
  return [
    {
      name: 'Daily Patient Follow-Up',
      type: 'EMAIL_FOLLOWUP',
      description: 'Send personalized follow-up emails to patients who haven\'t visited in 30+ days',
      prompt: 'Review the list of inactive patients and draft personalized follow-up emails for each. Consider their last treatment type and language preference. The email should be warm, caring, and encourage them to book a follow-up appointment. Include a link to bpr.rehab/signup to book.',
      schedule: '0 9 * * 1-5',
      config: { targetDays: 30, maxPatients: 10 },
      requiresApproval: true,
    },
    {
      name: 'Weekly Instagram Content',
      type: 'SOCIAL_POST',
      description: 'Generate 3 Instagram posts for the week every Monday',
      prompt: 'Create 3 Instagram posts for this week. Mix educational, motivational, and promotional content about BPR services. Each post should have: caption, hashtags, and image description. Topics should rotate between laser therapy, custom insoles, biomechanics, sports recovery, and general wellness.',
      schedule: '0 8 * * 1',
      config: { postsPerWeek: 3 },
      requiresApproval: true,
    },
    {
      name: 'Weekly Performance Report',
      type: 'REPORT',
      description: 'Generate a weekly summary of clinic performance every Friday',
      prompt: 'Generate a comprehensive weekly report including: appointments completed, new patients, patient retention rate, popular treatments, and any concerning trends. Provide actionable recommendations.',
      schedule: '0 17 * * 5',
      config: {},
      requiresApproval: false,
    },
    {
      name: 'Birthday Greetings',
      type: 'PATIENT_OUTREACH',
      description: 'Send birthday wishes to patients on their birthday',
      prompt: 'Check for patients with birthdays today and draft warm, personalized birthday messages. Include a special offer or discount code for their next treatment.',
      schedule: '0 8 * * *',
      config: { targetDays: 0 },
      requiresApproval: true,
    },
    {
      name: 'Treatment Plan Reminders',
      type: 'EMAIL_FOLLOWUP',
      description: 'Remind patients about ongoing treatment plans',
      prompt: 'Find patients with active treatment plans who have missed their scheduled sessions. Draft gentle reminder emails explaining the importance of consistency in their treatment.',
      schedule: '0 10 * * 2,4',
      config: { targetDays: 7 },
      requiresApproval: true,
    },
  ]
}
