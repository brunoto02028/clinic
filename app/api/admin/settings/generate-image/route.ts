import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { generateImageSmart } from '@/lib/ai-provider';
import { getConfigValue } from '@/lib/system-config';
import { writeFile, mkdir } from 'fs/promises';
import path from 'path';
import sharp from 'sharp';

export const dynamic = 'force-dynamic';

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

  console.log('[generate-image] Starting generation:', { section, hasRefImage: !!referenceImageBase64, promptLength: prompt.length });
  const startTime = Date.now();

  try {
    let imageBase64: string | null = null;

    // ─── If reference image provided, use Gemini multimodal (image model) ───
    if (referenceImageBase64) {
      if (process.env.AI_STRICT_MODE === 'true') {
        return NextResponse.json({ error: 'Reference image generation not available in strict mode (requires Gemini direct API).' }, { status: 503 });
      }
      const apiKey = await getConfigValue('GEMINI_API_KEY');
      const imageModel = (await getConfigValue('AI_IMAGE_MODEL')) || 'gemini-2.5-flash-preview-image-generation';
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
                { text: `CRITICAL: Generate a REAL PHOTOGRAPH — absolutely NO text, NO website screenshots, NO UI elements, NO navigation bars, NO buttons, NO logos, NO graphic design. ZERO text of any kind in the image.

Use the provided reference photo to create a NEW professional healthcare photograph. Incorporate elements from the reference (equipment, person, clinical setting) into a polished realistic scene. Instructions: ${prompt}. Professional commercial photography style. No text anywhere in the image.` },
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
        const refPrompt = `REAL PHOTOGRAPH ONLY — NO text, NO UI, NO website screenshots, NO graphic design: ${prompt}. Professional healthcare photography incorporating reference photo elements. Zero text of any kind.`;
        try {
          const urls = await generateImageSmart(refPrompt, { numImages: 1, aspectRatio });
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
      console.log('[generate-image] Using standard generation (no reference image)');
      const fullPrompt = `CRITICAL REQUIREMENTS — READ CAREFULLY:
This must be a REAL PHOTOGRAPH of an actual scene. Absolutely FORBIDDEN: website screenshots, UI mockups, navigation bars, buttons, text overlays, watermarks, logos, graphic design elements, website designs, app interfaces, or any kind of text in the image.

SUBJECT TO PHOTOGRAPH: ${prompt}

STYLE: Professional healthcare photography. Realistic. Shot as if by a commercial photographer. People, equipment, or clinical environments should look like real photographs — not illustrations, not digital art, not website designs. The image must contain ZERO text of any kind.`;

      try {
        console.log('[generate-image] Calling generateImageSmart...');
        const genStart = Date.now();
        const urls = await generateImageSmart(fullPrompt, { numImages: 1, aspectRatio });
        console.log(`[generate-image] generateImageSmart completed in ${Date.now() - genStart}ms`);
        
        if (urls.length > 0) {
          const url = urls[0];
          if (url.startsWith('data:image')) {
            const match = url.match(/^data:image\/\w+;base64,(.+)$/);
            if (match) imageBase64 = match[1];
          }
        }
      } catch (providerErr: any) {
        console.error('[generate-image] Generation error:', providerErr.message);
        const is429 = providerErr.message?.includes('429') || providerErr.message?.includes('quota');
        return NextResponse.json({ 
          error: is429
            ? 'Gemini image generation quota exceeded. The free tier limit has been reached. Please wait a few minutes and try again, or upload an image manually.'
            : `Image generation failed: ${providerErr.message}. Please try a different prompt or upload an image manually.`,
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

    // Try to optimize image, but don't fail if optimization doesn't work
    let finalImageUrl: string;
    let finalFilename: string;
    
    try {
      console.log('[generate-image] Attempting optimization with sharp...');
      const optimizeStart = Date.now();
      const inputBuffer = Buffer.from(imageBase64, 'base64');
      
      const optimizedBuffer = await sharp(inputBuffer)
        .resize(1920, 1080, { 
          fit: 'inside', 
          withoutEnlargement: true 
        })
        .webp({ 
          quality: 85,
          effort: 4
        })
        .toBuffer();
      
      const optimizedBase64 = optimizedBuffer.toString('base64');
      const optimizeTime = Date.now() - optimizeStart;
      
      const originalSize = (imageBase64.length * 0.75) / 1024;
      const optimizedSize = (optimizedBase64.length * 0.75) / 1024;
      const reduction = ((1 - optimizedSize / originalSize) * 100).toFixed(1);
      
      console.log(`[generate-image] Optimization success in ${optimizeTime}ms`);
      console.log(`[generate-image] Size: ${originalSize.toFixed(0)}KB → ${optimizedSize.toFixed(0)}KB (${reduction}% reduction)`);
      
      finalImageUrl = `data:image/webp;base64,${optimizedBase64}`;
      finalFilename = `bruno-physical-rehabilitation-${(section || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}.webp`;
    } catch (optimizeErr: any) {
      console.warn('[generate-image] Optimization failed, using original PNG:', optimizeErr.message);
      finalImageUrl = `data:image/png;base64,${imageBase64}`;
      finalFilename = `bruno-physical-rehabilitation-${(section || 'image').toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${Date.now().toString(36)}.png`;
    }

    const totalTime = Date.now() - startTime;
    console.log(`[generate-image] Success! Total time: ${totalTime}ms`);

    return NextResponse.json({ imageUrl: finalImageUrl, filename: finalFilename });
  } catch (error: any) {
    console.error('[generate-image] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
