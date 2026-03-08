import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateImage } from '@/lib/ai-provider';
import { getConfigValue } from '@/lib/system-config';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session || !['ADMIN', 'SUPERADMIN'].includes((session.user as any).role)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await req.json();
  const { prompt, aspectRatio = '16:9', section, referenceImageBase64, referenceImageMime } = body;

  if (!prompt) {
    return NextResponse.json({ error: 'prompt is required' }, { status: 400 });
  }

  try {
    let imageBase64: string | null = null;

    // ─── If reference image provided, use Gemini multimodal (image model) ───
    if (referenceImageBase64) {
      const apiKey = await getConfigValue('GEMINI_API_KEY');
      const imageModel = (await getConfigValue('AI_IMAGE_MODEL')) || 'gemini-2.5-flash-image';
      if (apiKey) {
        const refMime = referenceImageMime || 'image/jpeg';
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${imageModel}:generateContent?key=${apiKey}`;
        const geminiRes = await fetch(geminiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              parts: [
                { inlineData: { mimeType: refMime, data: referenceImageBase64 } },
                { text: `I'm providing you a reference photo. Use this reference photo as inspiration to create a NEW professional image for a physiotherapy clinic website. Instructions: ${prompt}. The generated image should incorporate elements from the reference photo (equipment, person, setting) into a polished, professional healthcare context. Make it realistic, high-quality, suitable for a medical website. No text overlay in the image.` },
              ],
            }],
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
          if (!imageBase64) console.warn('[generate-image] Gemini returned OK but no image data in response');
        } else {
          const errText = await geminiRes.text().catch(() => '');
          console.error(`[generate-image] Gemini ref-image error (${geminiRes.status}):`, errText.slice(0, 300));
        }
      }

      // Fallback: generate without reference image
      if (!imageBase64) {
        const refPrompt = `Professional photograph for a physiotherapy clinic website, incorporating elements from a provided reference photo: ${prompt}. Realistic, medical/healthcare setting, no text overlay.`;
        try {
          const urls = await generateImage(refPrompt, { numImages: 1 });
          if (urls.length > 0) {
            const url = urls[0];
            if (url.startsWith('data:image')) {
              const match = url.match(/^data:image\/\w+;base64,(.+)$/);
              if (match) imageBase64 = match[1];
            }
          }
        } catch (refErr: any) {
          console.error('[generate-image] Fallback generation error:', refErr.message);
        }
      }
    } else {
      // ─── Standard generation (no reference image) ───
      const fullPrompt = `Professional photograph for a physiotherapy clinic website: ${prompt}. Realistic, medical/healthcare setting, no text overlay.`;
      try {
        const urls = await generateImage(fullPrompt, { numImages: 1 });
        if (urls.length > 0) {
          const url = urls[0];
          if (url.startsWith('data:image')) {
            const match = url.match(/^data:image\/\w+;base64,(.+)$/);
            if (match) imageBase64 = match[1];
          }
        }
      } catch (providerErr: any) {
        console.error('[generate-image] Generation error:', providerErr.message);
        return NextResponse.json({ 
          error: `Image generation failed: ${providerErr.message}. Please try a different prompt or upload an image manually.`,
          fallback: true 
        }, { status: 422 });
      }
    }

    if (!imageBase64) {
      return NextResponse.json({ 
        error: 'Image generation failed. Gemini was unable to generate the image. This may be due to API limits, content policy, or the model not supporting image output. Please try a different prompt or upload an image manually.',
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
    console.error('[generate-image] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
