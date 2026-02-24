import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateImage } from '@/lib/ai-provider';
import { getConfigValue } from '@/lib/system-config';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import { randomUUID } from 'crypto';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, aspectRatio = '16:9', section } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  try {
    let imageBase64: string | null = null;
    const fullPrompt = `Professional photograph for a physiotherapy clinic website: ${prompt}. Realistic, medical/healthcare setting, no text overlay.`;

    // Method 1: Try unified AI provider (Abacus FLUX-2 PRO or Gemini)
    try {
      const urls = await generateImage(fullPrompt, { aspectRatio, numImages: 1 });
      if (urls.length > 0) {
        const url = urls[0];
        if (url.startsWith('data:image')) {
          // Extract base64 from data URI
          const match = url.match(/^data:image\/\w+;base64,(.+)$/);
          if (match) imageBase64 = match[1];
        } else if (url.startsWith('http')) {
          // Download the image from URL
          const imgRes = await fetch(url);
          if (imgRes.ok) {
            const buf = await imgRes.arrayBuffer();
            imageBase64 = Buffer.from(buf).toString('base64');
          }
        }
      }
    } catch (providerErr: any) {
      console.error('AI provider image gen error:', providerErr.message);
    }

    // Method 2: Fallback to Gemini direct if provider failed
    if (!imageBase64) {
      const apiKey = await getConfigValue('GEMINI_API_KEY');
      if (apiKey) {
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: `Generate a professional, high-quality photograph for a physiotherapy clinic website. The image should be: ${prompt}. Make it look realistic, professional, and suitable for a medical/healthcare website. No text in the image.` }] }],
            generationConfig: { responseModalities: ["TEXT", "IMAGE"] },
          }),
        });

        if (geminiRes.ok) {
          const data = await geminiRes.json();
          const parts = data.candidates?.[0]?.content?.parts || [];
          for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
              imageBase64 = part.inlineData.data;
              break;
            }
          }
        }
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ 
        error: 'Image generation not available. Please configure Abacus AI or Gemini API key with image generation enabled. You can still upload images manually.',
        fallback: true 
      }, { status: 422 });
    }

    // Save the generated image to persistent uploads directory
    const baseUploadsDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'public', 'uploads');
    const uploadsDir = path.join(baseUploadsDir, 'generated');
    await mkdir(uploadsDir, { recursive: true });

    // SEO-friendly filename based on section context
    const seoSlug = (section || 'image')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    const filename = `bruno-physical-rehabilitation-${seoSlug}-${Date.now().toString(36)}.png`;
    const filePath = path.join(uploadsDir, filename);
    const buffer = Buffer.from(imageBase64, 'base64');
    await writeFile(filePath, new Uint8Array(buffer));

    const imageUrl = `/uploads/generated/${filename}`;

    return NextResponse.json({ imageUrl, filename });
  } catch (error: any) {
    console.error('Image generation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
