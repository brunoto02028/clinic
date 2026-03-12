// app/api/patient/marketplace/download/route.ts
// Serve digital product downloads for paid orders
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getEffectiveUser } from '@/lib/get-effective-user'
import { readFile } from 'fs/promises'
import path from 'path'

export const dynamic = 'force-dynamic'

/**
 * GET /api/patient/marketplace/download?productId=xxx
 * Returns the digital file for a product the user has purchased.
 */
export async function GET(req: NextRequest) {
  try {
    const effectiveUser = await getEffectiveUser()
    if (!effectiveUser) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = effectiveUser.userId
    const productId = req.nextUrl.searchParams.get('productId')

    if (!productId) {
      return NextResponse.json({ error: 'productId required' }, { status: 400 })
    }

    // Check the user has a paid order containing this product
    const orderItem = await (prisma as any).marketplaceOrderItem.findFirst({
      where: {
        productId,
        order: {
          patientId: userId,
          status: { in: ['paid', 'processing', 'shipped', 'delivered'] },
        },
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            digitalFileUrl: true,
            isDigital: true,
          },
        },
      },
    })

    if (!orderItem || !orderItem.product?.isDigital || !orderItem.product?.digitalFileUrl) {
      return NextResponse.json(
        { error: 'Product not found or not purchased' },
        { status: 403 }
      )
    }

    const fileUrl = orderItem.product.digitalFileUrl as string

    // If it's an absolute URL, redirect to it
    if (fileUrl.startsWith('http')) {
      return NextResponse.redirect(fileUrl)
    }

    // If it's a local file path, serve it
    const baseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public')
    const filePath = path.join(baseDir, fileUrl.replace(/^\//, ''))

    try {
      const fileBuffer = await readFile(filePath)
      const ext = path.extname(filePath).toLowerCase()
      const contentType =
        ext === '.pdf' ? 'application/pdf' :
        ext === '.html' ? 'text/html' :
        ext === '.zip' ? 'application/zip' :
        'application/octet-stream'

      const safeName = orderItem.product.name
        .replace(/[^a-zA-Z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .substring(0, 60)

      return new NextResponse(fileBuffer, {
        headers: {
          'Content-Type': contentType,
          'Content-Disposition': `attachment; filename="BPR-${safeName}${ext}"`,
          'Content-Length': String(fileBuffer.length),
        },
      })
    } catch {
      return NextResponse.json({ error: 'File not found on server' }, { status: 404 })
    }
  } catch (err: any) {
    console.error('[marketplace download] error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
