import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth-options'
import { prisma } from '@/lib/db'
import sharp from 'sharp'
import path from 'path'
import fs from 'fs'

// POST /api/admin/marketing/watermark
// Applies logo watermark to an image (from URL or local path)
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any)?.role)) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { imageUrl, logoUrl, position = 'bottom-right', opacity = 0.85, scale = 0.22 } = await req.json()

    if (!imageUrl) return NextResponse.json({ error: 'imageUrl required' }, { status: 400 })

    // Helper: resolve /uploads/... to actual disk path (handles VPS symlink via UPLOADS_DIR)
    function resolveUploadPath(url: string): string {
      const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
      const relative = url.replace(/^\/uploads\//, '').replace(/^uploads\//, '')
      return path.join(uploadsBase, relative)
    }

    // 1. Fetch the base image
    let baseImageBuffer: Buffer
    if (imageUrl.startsWith('/uploads/') || imageUrl.startsWith('uploads/')) {
      const localPath = resolveUploadPath(imageUrl)
      if (!fs.existsSync(localPath)) {
        // fallback: try public/uploads
        const fallback = path.join(process.cwd(), 'public', imageUrl.startsWith('/') ? imageUrl : `/${imageUrl}`)
        if (!fs.existsSync(fallback)) return NextResponse.json({ error: `Image file not found: ${localPath}` }, { status: 404 })
        baseImageBuffer = fs.readFileSync(fallback)
      } else {
        baseImageBuffer = fs.readFileSync(localPath)
      }
    } else {
      const res = await fetch(imageUrl)
      if (!res.ok) return NextResponse.json({ error: 'Failed to fetch image' }, { status: 400 })
      baseImageBuffer = Buffer.from(await res.arrayBuffer())
    }

    // 2. Get logo — use provided logoUrl, fall back to clinic logo from DB, then BPR default
    let logoBuffer: Buffer | null = null
    const clinicId = (session.user as any).clinicId

    const logoUrlToUse = logoUrl || await getClinicLogoUrl(clinicId)

    if (logoUrlToUse) {
      try {
        if (logoUrlToUse.startsWith('/uploads/') || logoUrlToUse.startsWith('uploads/')) {
          const localPath = resolveUploadPath(logoUrlToUse)
          if (fs.existsSync(localPath)) {
            logoBuffer = fs.readFileSync(localPath)
          } else {
            // fallback: public/uploads
            const fallback = path.join(process.cwd(), 'public', logoUrlToUse.startsWith('/') ? logoUrlToUse : `/${logoUrlToUse}`)
            if (fs.existsSync(fallback)) logoBuffer = fs.readFileSync(fallback)
          }
        } else {
          const logoRes = await fetch(logoUrlToUse)
          if (logoRes.ok) logoBuffer = Buffer.from(await logoRes.arrayBuffer())
        }
      } catch {}
    }

    if (!logoBuffer) {
      return NextResponse.json({ error: 'No logo available. Upload a logo in Media Library first.' }, { status: 400 })
    }

    // 3. Process images with sharp
    const baseImage = sharp(baseImageBuffer)
    const baseMeta = await baseImage.metadata()
    const baseW = baseMeta.width || 1080
    const baseH = baseMeta.height || 1080

    // Resize logo to scale% of image width
    const logoW = Math.round(baseW * scale)
    const logoResized = await sharp(logoBuffer)
      .resize({ width: logoW, fit: 'inside' })
      .png()
      .toBuffer()

    const logoMeta = await sharp(logoResized).metadata()
    const logoH = logoMeta.height || logoW

    // Apply opacity to logo
    const logoWithOpacity = await sharp(logoResized)
      .composite([{
        input: Buffer.from([255, 255, 255, Math.round(opacity * 255)]),
        raw: { width: 1, height: 1, channels: 4 },
        tile: true,
        blend: 'dest-in',
      }])
      .png()
      .toBuffer()

    // Calculate position
    const padding = Math.round(baseW * 0.04)
    let left = padding
    let top = padding
    if (position === 'bottom-right') { left = baseW - logoW - padding; top = baseH - logoH - padding }
    else if (position === 'bottom-left') { left = padding; top = baseH - logoH - padding }
    else if (position === 'top-right') { left = baseW - logoW - padding; top = padding }
    else if (position === 'top-left') { left = padding; top = padding }
    else if (position === 'center') { left = Math.round((baseW - logoW) / 2); top = Math.round((baseH - logoH) / 2) }
    else if (position === 'bottom-center') { left = Math.round((baseW - logoW) / 2); top = baseH - logoH - padding }

    // 4. Composite
    const outputBuffer = await baseImage
      .composite([{ input: logoWithOpacity, left, top }])
      .jpeg({ quality: 92 })
      .toBuffer()

    // 5. Save to uploads
    const uploadsBase = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads')
    const outDir = path.join(uploadsBase, 'watermarked')
    fs.mkdirSync(outDir, { recursive: true })
    const fileName = `wm_${Date.now()}.jpg`
    const outPath = path.join(outDir, fileName)
    fs.writeFileSync(outPath, outputBuffer)

    const resultUrl = `/uploads/watermarked/${fileName}`
    return NextResponse.json({ success: true, url: resultUrl })

  } catch (error: any) {
    console.error('[WATERMARK]', error?.message)
    return NextResponse.json({ error: error?.message || 'Watermark failed' }, { status: 500 })
  }
}

async function getClinicLogoUrl(clinicId: string): Promise<string | null> {
  try {
    const settings = await prisma.clinicSettings.findFirst({ where: { clinicId } })
    return (settings as any)?.logoUrl || null
  } catch {
    return null
  }
}
