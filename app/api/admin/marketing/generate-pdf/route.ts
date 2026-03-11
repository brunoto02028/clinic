// app/api/admin/marketing/generate-pdf/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { buildPdfContentPrompt, BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'
import { generateMarketingImage } from '@/lib/marketing-image'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const {
      title,
      topic,
      audience = 'adults seeking physiotherapy and rehabilitation',
      pages = 12,
      includeExercises = true,
      action = 'generate',
      content,
      extraInstructions,
      // Section editing
      sectionIndex,
      editPrompt,
      // Image generation
      imagePrompt,
    } = body

    // Generate Content
    if (action === 'generate') {
      if (!title || !topic) {
        return NextResponse.json({ error: 'Title and topic required' }, { status: 400 })
      }

      const prompt = buildPdfContentPrompt({ title, topic, audience, pages, includeExercises, extraInstructions })
      const rawResponse = await claudeGenerate(
        [{ role: 'user', content: prompt }],
        { temperature: 0.4, maxTokens: 16000, systemPrompt: BPR_SYSTEM_CONTEXT }
      )

      let pdfData: any
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('No JSON')
        pdfData = JSON.parse(jsonMatch[0])
      } catch {
        pdfData = {
          title,
          subtitle: topic,
          price_suggestion: '£9.99',
          cover_image_prompt: '',
          sections: [{ heading: 'Content', content: rawResponse, type: 'educational', image_prompt: '' }],
          key_takeaways: [],
          target_keywords: [],
          references: [],
        }
      }

      return NextResponse.json({ success: true, content: pdfData })
    }

    // Edit a specific section with AI
    if (action === 'edit-section' && content && sectionIndex !== undefined && editPrompt) {
      const section = content.sections?.[sectionIndex]
      if (!section) {
        return NextResponse.json({ error: 'Section not found' }, { status: 400 })
      }

      const prompt = `You are editing a section of an eBook titled "${content.title}".

Current section heading: "${section.heading}"
Current content (first 1000 chars): ${section.content?.substring(0, 1000)}

User's edit request: "${editPrompt}"

Return ONLY a JSON object with the updated section:
{
  "heading": "...",
  "content": "Full updated content in markdown (500-800 words)...",
  "type": "${section.type}",
  "image_prompt": "Updated image description if relevant..."
}`

      const rawResponse = await claudeGenerate(
        [{ role: 'user', content: prompt }],
        { temperature: 0.4, maxTokens: 4096, systemPrompt: BPR_SYSTEM_CONTEXT }
      )

      let updatedSection = section
      try {
        const jsonMatch = rawResponse.match(/\{[\s\S]*\}/)
        if (jsonMatch) updatedSection = JSON.parse(jsonMatch[0])
      } catch {}

      const updatedContent = { ...content }
      updatedContent.sections = [...content.sections]
      updatedContent.sections[sectionIndex] = { ...section, ...updatedSection }

      return NextResponse.json({ success: true, content: updatedContent, updatedSectionIndex: sectionIndex })
    }

    // Generate image for a section or cover
    if (action === 'generate-image' && imagePrompt) {
      try {
        const imageUrl = await generateMarketingImage({ prompt: imagePrompt })
        return NextResponse.json({ success: true, imageUrl })
      } catch (err) {
        return NextResponse.json({ error: err instanceof Error ? err.message : 'Image generation failed' }, { status: 500 })
      }
    }

    // Export to HTML (for print-to-PDF)
    if (action === 'export' && content) {
      const html = buildPdfHtml(content)
      return new NextResponse(html, {
        headers: { 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    // AI Suggestions for title, topic, cover
    if (action === 'suggest' && body.field) {
      const { field, context } = body
      const ctx = context || {}

      let suggestPrompt = ''
      if (field === 'title') {
        suggestPrompt = `You are an eBook title generator for a physiotherapy/rehabilitation clinic called BPR (Bruno Physical Rehabilitation).
${ctx.topic ? `The topic is: "${ctx.topic}"` : 'No topic specified yet.'}
${ctx.audience ? `Target audience: ${ctx.audience}` : ''}

Generate 5 compelling, professional eBook titles that would appeal to patients and health-conscious adults. Titles should be clear, actionable, and SEO-friendly.

Return ONLY a JSON array of 5 title strings, e.g. ["Title 1", "Title 2", ...]`
      } else if (field === 'topic') {
        suggestPrompt = `You are a content strategist for a physiotherapy/rehabilitation clinic called BPR.
${ctx.title ? `The eBook title is: "${ctx.title}"` : 'No title specified yet.'}
${ctx.audience ? `Target audience: ${ctx.audience}` : ''}

Generate 5 compelling topic/subject descriptions for an eBook that a physiotherapy clinic could publish. Each should be 1-2 sentences describing the scope and angle.

Topics should cover: injury recovery, pain management, exercise therapy, biomechanics, preventive care, or wellness.

Return ONLY a JSON array of 5 topic strings, e.g. ["Topic description 1", "Topic description 2", ...]`
      } else if (field === 'cover') {
        suggestPrompt = `You are a creative director for eBook cover design.
${ctx.title ? `eBook title: "${ctx.title}"` : ''}
${ctx.topic ? `Topic: "${ctx.topic}"` : ''}

Generate 5 detailed cover image prompts for an AI image generator. Each should describe a professional, modern cover design suitable for a health/physiotherapy eBook. Include colors, style, elements, and mood.

Return ONLY a JSON array of 5 prompt strings, e.g. ["Prompt 1", "Prompt 2", ...]`
      } else {
        return NextResponse.json({ error: 'Unknown field' }, { status: 400 })
      }

      const rawResponse = await claudeGenerate(
        [{ role: 'user', content: suggestPrompt }],
        { temperature: 0.7, maxTokens: 2000, systemPrompt: BPR_SYSTEM_CONTEXT }
      )

      let suggestions: string[] = []
      try {
        const jsonMatch = rawResponse.match(/\[[\s\S]*\]/)
        if (jsonMatch) suggestions = JSON.parse(jsonMatch[0])
      } catch {}

      return NextResponse.json({ success: true, suggestions })
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 })

  } catch (error) {
    console.error('Generate PDF error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Generation failed' },
      { status: 500 }
    )
  }
}

function buildPdfHtml(content: {
  title: string
  subtitle: string
  sections: Array<{ heading: string; content: string; type: string }>
  key_takeaways: string[]
}): string {
  const sectionsHtml = content.sections.map((s) => `
    <section class="section section-${s.type}">
      <h2>${s.heading}</h2>
      <div class="section-content">${markdownToHtml(s.content)}</div>
    </section>
  `).join('')

  const takeawaysHtml = content.key_takeaways.length > 0 ? `
    <section class="takeaways">
      <h2>Key Takeaways</h2>
      <ul>${content.key_takeaways.map(t => `<li>${t}</li>`).join('')}</ul>
    </section>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${content.title}</title>
<style>
  @import url('https://fonts.googleapis.com/css2?family=Lato:wght@300;400;700&family=Playfair+Display:wght@400;700&display=swap');
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Lato', sans-serif; color: #1a2332; line-height: 1.7; font-size: 11pt; }
  .cover { background: linear-gradient(135deg, #0a1628 0%, #0d7377 100%); color: white; padding: 80px 60px; min-height: 100vh; display: flex; flex-direction: column; justify-content: center; page-break-after: always; }
  .cover-eyebrow { font-size: 9pt; letter-spacing: 4px; text-transform: uppercase; color: #3bffb0; margin-bottom: 24px; }
  .cover h1 { font-family: 'Playfair Display', serif; font-size: 36pt; line-height: 1.1; margin-bottom: 16px; font-weight: 400; }
  .cover-subtitle { font-size: 14pt; color: rgba(255,255,255,0.7); margin-bottom: 48px; font-weight: 300; }
  .cover-author { font-size: 10pt; color: rgba(255,255,255,0.6); border-top: 1px solid rgba(255,255,255,0.2); padding-top: 24px; }
  .cover-logo { font-family: 'Playfair Display', serif; font-size: 14pt; color: white; letter-spacing: 2px; }
  .content { padding: 48px 60px; }
  .section { margin-bottom: 40px; page-break-inside: avoid; }
  h2 { font-family: 'Playfair Display', serif; font-size: 18pt; color: #0d7377; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 2px solid #e8f5f5; font-weight: 400; }
  h3 { font-size: 12pt; font-weight: 700; color: #1a2332; margin: 20px 0 8px; }
  p { margin-bottom: 12px; }
  ul, ol { margin: 12px 0 12px 24px; }
  li { margin-bottom: 6px; }
  .section-exercise { background: #f0fafa; border-left: 4px solid #0d7377; padding: 24px; border-radius: 4px; }
  .section-cta { background: linear-gradient(135deg, #0a1628, #0d7377); color: white; padding: 32px; text-align: center; margin-top: 40px; }
  .section-cta h2 { color: #3bffb0; border-color: rgba(255,255,255,0.2); }
  .section-cta p { color: rgba(255,255,255,0.8); }
  .cta-url { display: inline-block; background: #c8952a; color: white; padding: 12px 28px; font-weight: 700; letter-spacing: 1px; margin-top: 16px; font-size: 11pt; }
  .takeaways { background: #fffbf0; border: 1px solid #c8952a; padding: 24px; margin-top: 32px; }
  .takeaways h2 { color: #c8952a; border-color: #f0e0b0; }
  .takeaways li { color: #5a4000; font-weight: 500; }
  .footer { text-align: center; padding: 24px; font-size: 9pt; color: #8a9bb0; border-top: 1px solid #e0e8f0; margin-top: 40px; }
  strong { font-weight: 700; }
  em { font-style: italic; }
  @media print { .cover { min-height: 100vh; } .section { page-break-inside: avoid; } }
</style>
</head>
<body>
<div class="cover">
  <div class="cover-eyebrow">BPR · Professional Guide</div>
  <h1>${content.title}</h1>
  <p class="cover-subtitle">${content.subtitle || 'Expert guidance for your recovery journey'}</p>
  <div class="cover-author">
    <div class="cover-logo">BPR</div>
    <p>Bruno Physical Rehabilitation<br>Richmond · Ipswich · bpr.rehab</p>
  </div>
</div>
<div class="content">
  ${sectionsHtml}
  ${takeawaysHtml}
  <div class="section-cta">
    <h2>Ready to Start Your Recovery?</h2>
    <p>Book your personalised assessment at BPR. We're open every day, including weekends.</p>
    <div class="cta-url">bpr.rehab/signup</div>
  </div>
  <div class="footer">
    &copy; BPR Bruno Physical Rehabilitation · bpr.rehab · Richmond TW10 6AQ &amp; Ipswich, Suffolk<br>
    This guide is for educational purposes only. Always consult a qualified professional for medical advice.
  </div>
</div>
</body>
</html>`
}

function markdownToHtml(md: string): string {
  return md
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/^(?!<[hul])(.+)$/gm, '<p>$1</p>')
    .replace(/<p><\/p>/g, '')
    .replace(/<p>(<h[23]>)/g, '$1')
    .replace(/(<\/h[23]>)<\/p>/g, '$1')
}
