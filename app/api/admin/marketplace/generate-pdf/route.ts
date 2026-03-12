// app/api/admin/marketplace/generate-pdf/route.ts
// PDF Creator Pro — Generate professional health/education PDFs with AI
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { claudeGenerate } from '@/lib/claude'
import { generateImage } from '@/lib/ai-provider'
import { prisma } from '@/lib/db'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { BPR_SYSTEM_CONTEXT } from '@/lib/marketing-prompts'

export const dynamic = 'force-dynamic'
export const maxDuration = 180

/**
 * Robust JSON extractor: tries direct parse first, then repairs truncated JSON.
 * Common cause of "Unexpected end of JSON input" is Claude hitting maxTokens mid-JSON.
 */
function extractJson(raw: string): any {
  // 1. Try direct match of a full JSON object
  const match = raw.match(/\{[\s\S]*\}/)
  if (match) {
    try { return JSON.parse(match[0]) } catch {}
  }
  // 2. If truncated, attempt to repair by closing open structures
  let attempt = raw
  if (!attempt.includes('{')) throw new Error('No JSON object in response')
  const start = attempt.indexOf('{')
  attempt = attempt.slice(start)
  // Count unclosed brackets/braces
  let braces = 0, brackets = 0, inString = false, escape = false
  for (const ch of attempt) {
    if (escape) { escape = false; continue }
    if (ch === '\\' && inString) { escape = true; continue }
    if (ch === '"') { inString = !inString; continue }
    if (inString) continue
    if (ch === '{') braces++
    if (ch === '}') braces--
    if (ch === '[') brackets++
    if (ch === ']') brackets--
  }
  // Close any open arrays/objects
  if (inString) attempt += '"'
  while (brackets > 0) { attempt += ']'; brackets-- }
  while (braces > 0) { attempt += '}'; braces-- }
  try { return JSON.parse(attempt) } catch (e) {
    throw new Error('AI response was truncated or malformed. Please try again.')
  }
}

const PDF_SYSTEM_PROMPT = `${BPR_SYSTEM_CONTEXT}

You are a medical content writer creating premium educational PDF guides for sale.
These PDFs must be:
- EVIDENCE-BASED with real academic references (PubMed, NICE guidelines, WHO, NHS)
- Written in clear, accessible English (UK spelling)
- Professional enough to sell as digital products (£5-£30 range)
- Life-changing practical content that readers can immediately apply
- Include at least 5-8 real bibliographic references per PDF
- Include actionable exercises, protocols, or lifestyle changes
- Sound authoritative but warm — like a top physio explaining to a friend

REFERENCE FORMAT: Use numbered references [1], [2] etc. in text, with full citations at the end.
Example: "Studies show that eccentric exercises reduce tendon pain by up to 60% [1]."
References section: "1. Alfredson H, et al. Heavy-load eccentric calf muscle training for the treatment of chronic Achilles tendinosis. Am J Sports Med. 1998;26(3):360-6."

Use REAL published research — do not fabricate references.`

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { action } = body

    if (action === 'generate-content') {
      return generateContent(body)
    } else if (action === 'generate-cover') {
      return generateCover(body)
    } else if (action === 'save-product') {
      return saveAsProduct(body, session)
    } else if (action === 'update-product') {
      return updateProduct(body, session)
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 })
    }
  } catch (error: any) {
    console.error('[pdf-creator] Error:', error)
    return NextResponse.json({ error: error.message || 'Failed' }, { status: 500 })
  }
}

async function generateContent(body: any) {
  const { topic, category, targetAudience, pageTarget = 15, language = 'en' } = body

  if (!topic) {
    return NextResponse.json({ error: 'Topic is required' }, { status: 400 })
  }

  const lang = language === 'pt-BR' ? 'Brazilian Portuguese' : 'English (UK spelling)'
  // Clamp sections to a safe number to avoid token overflow
  const numSections = Math.min(Math.max(Math.round(pageTarget / 3), 3), 8)

  // ─── PASS 1: metadata + structure outline (fast, small) ──────────────────
  const metaPrompt = `
TASK: Create the METADATA and OUTLINE for a premium PDF health guide.

TOPIC: "${topic}"
CATEGORY: ${category || 'Health & Rehabilitation'}
AUDIENCE: ${targetAudience || 'Adults seeking to improve their health and manage pain'}
LANGUAGE: ${lang}
NUMBER OF SECTIONS: ${numSections}

Respond ONLY with valid JSON (no markdown, no explanation):
{
  "title": "Compelling professional title",
  "subtitle": "Descriptive subtitle",
  "description": "2-3 sentence marketing description",
  "shortDescription": "One sentence preview text",
  "difficulty": "beginner|intermediate|advanced",
  "suggestedPrice": 9.99,
  "coverImagePrompt": "Prompt for AI cover image — professional medical/wellness aesthetic, no text, no letters",
  "tags": ["tag1","tag2","tag3","tag4","tag5"],
  "sectionOutline": [
    {"title": "Section title", "focus": "What this section covers in 1 sentence"}
  ]
}`

  const metaRaw = await claudeGenerate(
    [{ role: 'user', content: metaPrompt }],
    { temperature: 0.5, maxTokens: 2048, systemPrompt: PDF_SYSTEM_PROMPT }
  )

  let meta: any
  try {
    meta = extractJson(metaRaw)
  } catch (e: any) {
    return NextResponse.json({ error: `Metadata generation failed: ${e.message}` }, { status: 500 })
  }

  // ─── PASS 2: generate each section individually ───────────────────────────
  const sections: any[] = []
  const outline: any[] = meta.sectionOutline || []

  for (let i = 0; i < outline.length; i++) {
    const sec = outline[i]
    const isLast = i === outline.length - 1

    const sectionPrompt = `
Write SECTION ${i + 1} of a premium health PDF guide.

GUIDE TITLE: "${meta.title}"
SECTION TITLE: "${sec.title}"
SECTION FOCUS: ${sec.focus}
LANGUAGE: ${lang}
${isLast ? 'This is the LAST section — include a call-to-action to book at BPR (bpr.rehab).' : ''}

Respond ONLY with valid JSON (no markdown):
{
  "title": "${sec.title}",
  "content": "<h3>Subheading</h3><p>Paragraph with inline references like [1]. Use <strong>, <em>, <blockquote>, <ul><li> tags. Write 400-600 words of genuinely useful content.</p>",
  "keyTakeaways": ["Practical takeaway 1", "Practical takeaway 2", "Practical takeaway 3"]
}`

    try {
      const secRaw = await claudeGenerate(
        [{ role: 'user', content: sectionPrompt }],
        { temperature: 0.6, maxTokens: 3000, systemPrompt: PDF_SYSTEM_PROMPT }
      )
      const secData = extractJson(secRaw)
      sections.push(secData)
    } catch {
      // Fallback: add a placeholder section rather than fail entirely
      sections.push({
        title: sec.title,
        content: `<p>Content for "${sec.title}" — please edit this section.</p>`,
        keyTakeaways: [],
      })
    }
  }

  // ─── PASS 3: references (separate small call) ─────────────────────────────
  const refPrompt = `
Generate 6-8 REAL bibliographic references for a health guide about "${topic}".
Use only real published research (PubMed, NICE, NHS, WHO, Cochrane).

Respond ONLY with valid JSON:
{
  "references": [
    "1. Author A, et al. Title. Journal. Year;Vol(Issue):Pages. PMID/DOI.",
    "2. ..."
  ]
}`

  let references: string[] = []
  try {
    const refRaw = await claudeGenerate(
      [{ role: 'user', content: refPrompt }],
      { temperature: 0.3, maxTokens: 1500, systemPrompt: PDF_SYSTEM_PROMPT }
    )
    const refData = extractJson(refRaw)
    references = refData.references || []
  } catch {
    references = ['1. Please add real references before publishing.']
  }

  const pdfData = {
    title: meta.title,
    subtitle: meta.subtitle,
    description: meta.description,
    shortDescription: meta.shortDescription,
    difficulty: meta.difficulty,
    suggestedPrice: meta.suggestedPrice,
    coverImagePrompt: meta.coverImagePrompt,
    tags: meta.tags,
    tableOfContents: sections.map((s: any) => s.title),
    sections,
    references,
  }

  return NextResponse.json({ success: true, content: pdfData })
}

async function generateCover(body: any) {
  const { prompt: coverPrompt, title } = body

  const fullPrompt = `Professional book/ebook cover design for a health guide: ${coverPrompt || title}. Modern, clean, medical/wellness aesthetic. Warm colours, professional photography style. NO text, NO letters, NO words in the image. Just visual imagery.`

  try {
    const urls = await generateImage(fullPrompt, { numImages: 1 })
    if (urls.length > 0) {
      // Save the image
      let imageBase64 = urls[0]
      if (imageBase64.startsWith('data:image')) {
        const match = imageBase64.match(/^data:image\/\w+;base64,(.+)$/)
        if (match) imageBase64 = match[1]
      }
      
      const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
      const uploadsDir = path.join(baseUploadsDir, 'marketplace')
      await mkdir(uploadsDir, { recursive: true })

      const slug = (title || 'pdf-cover').toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 40)
      const filename = `bpr-cover-${slug}-${Date.now().toString(36)}.png`
      const filePath = path.join(uploadsDir, filename)
      await writeFile(filePath, Buffer.from(imageBase64, 'base64'))

      return NextResponse.json({ imageUrl: `/uploads/marketplace/${filename}` })
    }
    return NextResponse.json({ error: 'No image generated' }, { status: 500 })
  } catch (err: any) {
    console.error('[pdf-creator] Cover generation error:', err.message)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}

async function saveAsProduct(body: any, session: any) {
  const {
    title, subtitle, description, shortDescription, content, sections,
    references, tags, price, imageUrl, category, difficulty,
    pageCount, language, previewHtml,
  } = body

  const clinicId = (session.user as any).clinicId

  // Build full HTML content for the PDF
  const fullHtml = buildPdfHtml({
    title, subtitle, sections, references, difficulty,
  })

  // Save HTML to file for PDF generation
  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
  const uploadsDir = path.join(baseUploadsDir, 'marketplace', 'pdfs')
  await mkdir(uploadsDir, { recursive: true })

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60)
  const htmlFilename = `bpr-guide-${slug}-${Date.now().toString(36)}.html`
  const htmlPath = path.join(uploadsDir, htmlFilename)
  await writeFile(htmlPath, fullHtml, 'utf-8')

  // Save preview (first 2 sections only)
  const previewSections = (sections || []).slice(0, 2)
  const previewFullHtml = buildPdfHtml({
    title, subtitle, sections: previewSections, references: [], difficulty,
    isPreview: true,
  })
  const previewFilename = `bpr-preview-${slug}-${Date.now().toString(36)}.html`
  const previewPath = path.join(uploadsDir, previewFilename)
  await writeFile(previewPath, previewFullHtml, 'utf-8')

  // Ensure unique slug
  const existingSlug = await (prisma as any).marketplaceProduct.findUnique({ where: { slug } })
  const finalSlug = existingSlug ? `${slug}-${Date.now().toString(36)}` : slug

  // Create marketplace product
  const product = await (prisma as any).marketplaceProduct.create({
    data: {
      clinicId,
      name: title,
      description: description || subtitle || '',
      shortDescription: shortDescription || '',
      category: category || 'digital_program',
      price: parseFloat(price) || 9.99,
      currency: 'GBP',
      imageUrl: imageUrl || null,
      isDigital: true,
      digitalFileUrl: `/uploads/marketplace/pdfs/${htmlFilename}`,
      previewFileUrl: `/uploads/marketplace/pdfs/${previewFilename}`,
      pageCount: pageCount || sections?.length * 2 || 10,
      contentLanguage: language || 'en',
      slug: finalSlug,
      tags: tags || [],
      featured: false,
      isActive: false, // Start as draft — admin activates after review
      sortOrder: 0,
    },
  })

  return NextResponse.json({ success: true, product })
}

async function updateProduct(body: any, session: any) {
  const {
    productId, title, subtitle, description, shortDescription,
    sections, references, tags, price, imageUrl, category,
    difficulty, pageCount, language,
  } = body

  if (!productId) return NextResponse.json({ error: 'productId required' }, { status: 400 })

  const fullHtml = buildPdfHtml({ title, subtitle, sections, references, difficulty })

  const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
  const uploadsDir = path.join(baseUploadsDir, 'marketplace', 'pdfs')
  await mkdir(uploadsDir, { recursive: true })

  const slug = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').substring(0, 60)
  const htmlFilename = `bpr-guide-${slug}-${Date.now().toString(36)}.html`
  await writeFile(path.join(uploadsDir, htmlFilename), fullHtml, 'utf-8')

  const previewSections = (sections || []).slice(0, 2)
  const previewHtml = buildPdfHtml({ title, subtitle, sections: previewSections, references: [], difficulty, isPreview: true })
  const previewFilename = `bpr-preview-${slug}-${Date.now().toString(36)}.html`
  await writeFile(path.join(uploadsDir, previewFilename), previewHtml, 'utf-8')

  const product = await (prisma as any).marketplaceProduct.update({
    where: { id: productId },
    data: {
      name: title,
      description: description || subtitle || '',
      shortDescription: shortDescription || '',
      category: category || 'digital_program',
      price: parseFloat(price) || 9.99,
      imageUrl: imageUrl || undefined,
      digitalFileUrl: `/uploads/marketplace/pdfs/${htmlFilename}`,
      previewFileUrl: `/uploads/marketplace/pdfs/${previewFilename}`,
      pageCount: pageCount || sections?.length * 2 || 10,
      contentLanguage: language || 'en',
      tags: tags || [],
    },
  })

  return NextResponse.json({ success: true, product })
}

function buildPdfHtml(opts: {
  title: string
  subtitle?: string
  sections: any[]
  references: string[]
  difficulty?: string
  isPreview?: boolean
}): string {
  const { title, subtitle, sections = [], references = [], difficulty, isPreview } = opts

  const sectionHtml = sections.map((s: any, i: number) => `
    <div class="section" style="page-break-before: ${i > 0 ? 'always' : 'auto'};">
      <h2 class="section-title">${s.title}</h2>
      <div class="section-content">${s.content}</div>
      ${s.keyTakeaways?.length ? `
        <div class="takeaways">
          <h4>Key Takeaways</h4>
          <ul>${s.keyTakeaways.map((t: string) => `<li>${t}</li>`).join('')}</ul>
        </div>
      ` : ''}
    </div>
  `).join('\n')

  const refsHtml = references.length > 0 ? `
    <div class="section references" style="page-break-before: always;">
      <h2 class="section-title">References</h2>
      <ol class="ref-list">
        ${references.map((r: string) => `<li>${r}</li>`).join('\n')}
      </ol>
    </div>
  ` : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=Merriweather:wght@300;400;700&display=swap');

    :root {
      --brand: #5dc9c0;
      --brand-dark: #3a9e96;
      --text: #1a1a1a;
      --text-light: #555;
      --bg: #ffffff;
      --accent-bg: #f0faf9;
      --border: #e0e0e0;
    }

    * { margin: 0; padding: 0; box-sizing: border-box; }

    body {
      font-family: 'Inter', -apple-system, sans-serif;
      color: var(--text);
      line-height: 1.7;
      font-size: 11pt;
      background: var(--bg);
    }

    /* Cover Page */
    .cover {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      text-align: center;
      background: linear-gradient(135deg, #0a2e2c 0%, #134e4a 40%, #1a6b65 70%, var(--brand) 100%);
      color: white;
      padding: 3rem 2rem;
      page-break-after: always;
    }

    .cover .logo {
      font-size: 2.5rem;
      font-weight: 800;
      letter-spacing: 0.1em;
      margin-bottom: 0.5rem;
      font-family: 'Inter', sans-serif;
    }

    .cover .logo-sub {
      font-size: 0.75rem;
      text-transform: uppercase;
      letter-spacing: 0.3em;
      opacity: 0.7;
      margin-bottom: 3rem;
    }

    .cover h1 {
      font-family: 'Merriweather', serif;
      font-size: 2.2rem;
      font-weight: 700;
      line-height: 1.3;
      margin-bottom: 1rem;
      max-width: 600px;
    }

    .cover .subtitle {
      font-size: 1.1rem;
      opacity: 0.85;
      max-width: 500px;
      line-height: 1.5;
      margin-bottom: 2rem;
    }

    .cover .badge {
      display: inline-block;
      background: rgba(255,255,255,0.15);
      border: 1px solid rgba(255,255,255,0.3);
      border-radius: 2rem;
      padding: 0.4rem 1.2rem;
      font-size: 0.8rem;
      text-transform: uppercase;
      letter-spacing: 0.1em;
    }

    .cover .footer-text {
      position: absolute;
      bottom: 2rem;
      font-size: 0.7rem;
      opacity: 0.5;
    }

    ${isPreview ? `
    .preview-watermark {
      position: fixed;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%) rotate(-35deg);
      font-size: 5rem;
      font-weight: 800;
      color: rgba(93, 201, 192, 0.08);
      pointer-events: none;
      z-index: 999;
      white-space: nowrap;
    }
    ` : ''}

    /* Content */
    .content-wrapper {
      max-width: 700px;
      margin: 0 auto;
      padding: 2rem 2.5rem;
    }

    /* Table of Contents */
    .toc {
      padding: 2rem 2.5rem;
      max-width: 700px;
      margin: 0 auto;
      page-break-after: always;
    }

    .toc h2 {
      font-family: 'Merriweather', serif;
      font-size: 1.5rem;
      color: var(--brand-dark);
      margin-bottom: 1.5rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--brand);
    }

    .toc ol { padding-left: 1.5rem; }
    .toc li {
      padding: 0.4rem 0;
      font-size: 1rem;
      color: var(--text);
      border-bottom: 1px dotted var(--border);
    }

    /* Sections */
    .section {
      padding: 2rem 2.5rem;
      max-width: 700px;
      margin: 0 auto;
    }

    .section-title {
      font-family: 'Merriweather', serif;
      font-size: 1.4rem;
      color: var(--brand-dark);
      margin-bottom: 1rem;
      padding-bottom: 0.5rem;
      border-bottom: 2px solid var(--brand);
    }

    .section-content h3 {
      font-size: 1.1rem;
      color: var(--text);
      margin: 1.5rem 0 0.5rem;
      font-weight: 600;
    }

    .section-content p {
      margin-bottom: 0.8rem;
      color: var(--text-light);
    }

    .section-content ul, .section-content ol {
      padding-left: 1.5rem;
      margin-bottom: 1rem;
    }

    .section-content li {
      margin-bottom: 0.3rem;
      color: var(--text-light);
    }

    .section-content strong { color: var(--text); }
    
    .section-content blockquote {
      border-left: 3px solid var(--brand);
      padding: 0.8rem 1rem;
      margin: 1rem 0;
      background: var(--accent-bg);
      border-radius: 0 8px 8px 0;
      font-style: italic;
      color: var(--text-light);
    }

    /* Key Takeaways */
    .takeaways {
      background: var(--accent-bg);
      border: 1px solid var(--brand);
      border-radius: 12px;
      padding: 1.2rem 1.5rem;
      margin-top: 1.5rem;
    }

    .takeaways h4 {
      color: var(--brand-dark);
      font-size: 0.9rem;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 0.5rem;
    }

    .takeaways ul { list-style: none; padding: 0; }
    .takeaways li {
      padding: 0.3rem 0;
      padding-left: 1.5rem;
      position: relative;
      color: var(--text);
      font-weight: 500;
    }
    .takeaways li::before {
      content: "✓";
      position: absolute;
      left: 0;
      color: var(--brand);
      font-weight: 700;
    }

    /* References */
    .references .ref-list {
      font-size: 0.85rem;
      color: var(--text-light);
      line-height: 1.6;
    }
    .references .ref-list li {
      margin-bottom: 0.5rem;
      word-break: break-word;
    }

    /* Footer */
    .page-footer {
      text-align: center;
      padding: 2rem;
      font-size: 0.75rem;
      color: var(--text-light);
      border-top: 1px solid var(--border);
      margin-top: 2rem;
    }

    .page-footer a { color: var(--brand-dark); text-decoration: none; }

    /* Print styles */
    @media print {
      body { font-size: 10pt; }
      .cover { min-height: 100vh; }
      .section { page-break-inside: avoid; }
    }
  </style>
</head>
<body>
  ${isPreview ? '<div class="preview-watermark">PREVIEW</div>' : ''}
  
  <!-- Cover Page -->
  <div class="cover">
    <div class="logo">BPR</div>
    <div class="logo-sub">Bruno Physical Rehabilitation</div>
    <h1>${title}</h1>
    ${subtitle ? `<p class="subtitle">${subtitle}</p>` : ''}
    ${difficulty ? `<span class="badge">${difficulty} level</span>` : ''}
  </div>

  <!-- Table of Contents -->
  <div class="toc">
    <h2>Table of Contents</h2>
    <ol>
      ${sections.map((s: any) => `<li>${s.title}</li>`).join('\n')}
      ${references.length > 0 ? '<li>References</li>' : ''}
    </ol>
  </div>

  <!-- Content Sections -->
  ${sectionHtml}

  ${isPreview ? `
    <div class="section" style="page-break-before: always; text-align: center; padding-top: 4rem;">
      <h2 style="color: var(--brand-dark); font-family: 'Merriweather', serif; margin-bottom: 1rem;">
        This is a Preview
      </h2>
      <p style="color: var(--text-light); max-width: 400px; margin: 0 auto 2rem;">
        Purchase the full guide to access all chapters, exercises, and references.
      </p>
      <a href="https://bpr.rehab/dashboard/marketplace" 
         style="display: inline-block; background: var(--brand); color: white; padding: 0.8rem 2rem; border-radius: 8px; text-decoration: none; font-weight: 600;">
        Get Full Guide →
      </a>
    </div>
  ` : ''}

  <!-- References -->
  ${!isPreview ? refsHtml : ''}

  <!-- Footer -->
  <div class="page-footer">
    <p>© ${new Date().getFullYear()} Bruno Physical Rehabilitation (BPR) — <a href="https://bpr.rehab">bpr.rehab</a></p>
    <p>Richmond TW10 6AQ & Ipswich, Suffolk, UK</p>
    <p style="margin-top: 0.5rem; font-size: 0.65rem;">
      This guide is for informational purposes only and does not replace professional medical advice.
      Always consult a qualified healthcare professional before starting any exercise programme.
    </p>
  </div>
</body>
</html>`
}
