import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth-options';
import { prisma } from '@/lib/db';
import { getConfigValue } from '@/lib/system-config';
import { readFile } from 'fs/promises';
import path from 'path';

// Convert local image path to base64 data URI
async function imageToBase64(imagePath: string): Promise<string | null> {
  try {
    // imagePath is like /uploads/scans/FS-2026-00001/left-plantar-123.jpg
    const fullPath = path.join(process.cwd(), 'public', imagePath);
    const buffer = await readFile(fullPath);
    const ext = imagePath.split('.').pop()?.toLowerCase() || 'jpg';
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    return `data:${mime};base64,${buffer.toString('base64')}`;
  } catch (err) {
    console.error(`Failed to read image: ${imagePath}`, err);
    return null;
  }
}

// Build Gemini vision parts with images
async function buildGeminiParts(
  leftImages: string[],
  rightImages: string[],
  prompt: string
): Promise<any[]> {
  const parts: any[] = [];

  parts.push({ text: 'You are a clinical biomechanics expert with computer vision capabilities. Analyse the provided foot photographs carefully. Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.\n\n' + prompt });

  for (let i = 0; i < Math.min(leftImages.length, 7); i++) {
    const base64 = await imageToBase64(leftImages[i]);
    if (base64) {
      const fileName = leftImages[i].split('/').pop() || '';
      const isShoe = fileName.includes('shoe');
      const angle = fileName.split('-')[1] || `image ${i + 1}`;
      const label = isShoe ? `Left Shoe — Sole Wear Pattern` : `Left Foot — ${angle}`;
      parts.push({ text: `\n[${label}]` });
      const match = base64.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
  }

  for (let i = 0; i < Math.min(rightImages.length, 7); i++) {
    const base64 = await imageToBase64(rightImages[i]);
    if (base64) {
      const fileName = rightImages[i].split('/').pop() || '';
      const isShoe = fileName.includes('shoe');
      const angle = fileName.split('-')[1] || `image ${i + 1}`;
      const label = isShoe ? `Right Shoe — Sole Wear Pattern` : `Right Foot — ${angle}`;
      parts.push({ text: `\n[${label}]` });
      const match = base64.match(/^data:(.+?);base64,(.+)$/);
      if (match) {
        parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
      }
    }
  }

  return parts;
}

// POST - Analyze foot scan with AI Vision
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    const { id } = params;
    const userId = (session.user as any).id;
    
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true, clinicId: true }
    });
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }
    
    // Only staff can run analysis
    if (user.role === 'PATIENT') {
      return NextResponse.json({ error: 'Only staff can run analysis' }, { status: 403 });
    }
    
    const footScan = await prisma.footScan.findUnique({
      where: { id },
      include: {
        patient: {
          select: { 
            id: true, 
            firstName: true, 
            lastName: true,
            medicalScreening: true
          }
        }
      }
    });
    
    if (!footScan) {
      return NextResponse.json({ error: 'Foot scan not found' }, { status: 404 });
    }
    
    if (user.clinicId !== footScan.clinicId) {
      return NextResponse.json({ error: 'Access denied' }, { status: 403 });
    }
    
    // Check if we have capture data
    const leftImages = (footScan.leftFootImages as string[]) || [];
    const rightImages = (footScan.rightFootImages as string[]) || [];
    const captureMetadata = footScan.captureMetadata as any;
    
    if (leftImages.length === 0 && rightImages.length === 0) {
      return NextResponse.json({ error: 'No foot images to analyze' }, { status: 400 });
    }
    
    // Update status to processing
    await prisma.footScan.update({
      where: { id },
      data: { status: 'PROCESSING' }
    });
    
    // Prepare patient context
    const patientContext = {
      name: `${footScan.patient.firstName} ${footScan.patient.lastName}`,
      medicalHistory: footScan.patient.medicalScreening ? {
        neurologicalSymptoms: footScan.patient.medicalScreening.neurologicalSymptoms,
        cardiovascularSymptoms: footScan.patient.medicalScreening.cardiovascularSymptoms,
        traumaHistory: footScan.patient.medicalScreening.traumaHistory,
        currentMedications: footScan.patient.medicalScreening.currentMedications,
        surgicalHistory: footScan.patient.medicalScreening.surgicalHistory
      } : null
    };

    // Check if images contain A4 reference for calibration
    const hasA4Reference = captureMetadata?.referenceObject === 'A4_paper';
    
    // Prepare vision analysis prompt
    const analysisPrompt = `You are an expert biomechanical analyst, podiatrist, and orthotics specialist.

You are examining REAL photographs of a patient's feet taken from multiple angles.

## Patient Information
- Name: ${patientContext.name}
- Medical History: ${patientContext.medicalHistory ? JSON.stringify(patientContext.medicalHistory) : 'Not provided'}
- Capture Device: ${captureMetadata?.device || 'Smartphone camera'}
- Date: ${captureMetadata?.timestamp || footScan.createdAt.toISOString()}
- Total Images: ${leftImages.length + rightImages.length} (${leftImages.length} left, ${rightImages.length} right)
${hasA4Reference ? '- Reference Object: A4 paper (210mm × 297mm) visible in plantar views for scale calibration' : ''}

## Your Task
Carefully examine EACH image and provide a detailed biomechanical assessment. Focus on:

1. **Plantar views**: Foot outline shape, toe alignment, arch impression area, callus patterns, skin conditions
2. **Medial views**: Arch height and shape, navicular drop estimation, talar position
3. **Lateral views**: Lateral arch profile, 5th metatarsal prominence, ankle alignment  
4. **Anterior views**: Toe alignment, hallux valgus angle, metatarsal spread, digital deformities
5. **Posterior views**: Calcaneal alignment (valgus/varus), Achilles tendon alignment, heel symmetry
6. **Shoe sole views**: Wear pattern analysis — medial/lateral/central wear, heel erosion, forefoot wear, asymmetry between left and right

${hasA4Reference ? `## A4 Paper Calibration
The plantar (bottom) photos include an A4 sheet of paper (210mm × 297mm). Use the visible paper edges to estimate REAL measurements in millimetres. Calculate the pixel-to-mm ratio from the A4 dimensions and apply it to foot measurements.` : `## Measurement Estimation
Without a calibration reference, estimate measurements based on typical adult foot proportions and anatomical landmarks visible in the images.`}

## Required JSON Output
Respond with ONLY valid JSON in this exact format:

{
  "archType": "Normal" | "Flat" | "High",
  "archIndex": <float 0.0-0.5, ratio of midfoot to total contact area>,
  "pronation": "Neutral" | "Overpronation" | "Supination",
  "calcanealAlignment": <float degrees, positive=valgus, negative=varus>,
  "halluxValgusAngle": <float degrees>,
  "metatarsalSpread": <float mm>,
  "navicularHeight": <float mm>,
  "leftFootLength": <float mm>,
  "rightFootLength": <float mm>,
  "leftFootWidth": <float mm>,
  "rightFootWidth": <float mm>,
  "leftArchHeight": <float mm>,
  "rightArchHeight": <float mm>,
  "gaitAnalysis": {
    "pattern": "Normal" | "Toe-walking" | "Heel-striking" | "Shuffling",
    "symmetry": "Symmetric" | "Asymmetric",
    "concerns": ["list of observed concerns from the images"]
  },
  "strideLength": <estimated mm>,
  "cadence": <estimated steps per minute>,
  "biomechanicFindings": {
    "pressureDistribution": "detailed description based on callus patterns and foot shape",
    "alignmentIssues": ["specific issues observed in the images"],
    "muscularImbalances": ["imbalances suggested by foot positioning"],
    "riskFactors": ["clinical risk factors identified"],
    "skinConditions": ["any visible skin issues: calluses, corns, discoloration"],
    "toeDeformities": ["any visible toe deformities"]
  },
  "a4Calibration": {
    "detected": <boolean - was A4 paper visible?>,
    "confidence": "high" | "medium" | "low",
    "estimatedScale": <float mm per pixel if detectable, else null>
  },
  "recommendations": {
    "insoleType": "Sport" | "Comfort" | "Medical",
    "supportLevel": "Minimal" | "Moderate" | "Maximum",
    "archSupportHeight": <mm>,
    "heelCupDepth": <mm>,
    "metatarsalPad": <boolean>,
    "additionalSupport": ["specific support features needed"],
    "exercises": ["recommended therapeutic exercises"],
    "footwearAdvice": "specific footwear recommendations"
  },
  "clinicalSummary": "Comprehensive clinical paragraph describing all findings from the images",
  "patientSummary": "Simple patient-friendly summary",
  "confidenceLevel": "high" | "medium" | "low",
  "shoeWearAnalysis": {
    "leftShoe": {
      "heelWear": "medial" | "lateral" | "central" | "even" | "not visible",
      "forefootWear": "medial" | "lateral" | "central" | "even" | "not visible",
      "overallWearLevel": "minimal" | "moderate" | "severe",
      "wearDescription": "detailed description of left shoe wear pattern"
    },
    "rightShoe": {
      "heelWear": "medial" | "lateral" | "central" | "even" | "not visible",
      "forefootWear": "medial" | "lateral" | "central" | "even" | "not visible",
      "overallWearLevel": "minimal" | "moderate" | "severe",
      "wearDescription": "detailed description of right shoe wear pattern"
    },
    "symmetry": "symmetric" | "asymmetric",
    "gaitImplication": "what the wear pattern tells us about the patient's gait",
    "shoeTypeObserved": "type of shoe if identifiable (trainer, formal, sandal, etc.)"
  },
  "imageQualityNotes": "notes on image quality and any limitations"
}

Be precise. Base ALL measurements and observations on what you can ACTUALLY SEE in the images. If an image is unclear, note it in imageQualityNotes and adjust confidence accordingly.`;
    
    try {
      // Build Gemini vision parts with actual images
      const parts = await buildGeminiParts(leftImages, rightImages, analysisPrompt);

      const geminiKey = await getConfigValue('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
      if (!geminiKey) {
        throw new Error('GEMINI_API_KEY not configured');
      }
      const geminiModel = (await getConfigValue('GEMINI_MODEL')) || 'gemini-2.0-flash';
      const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

      const geminiRes = await fetch(geminiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 4000 },
        }),
      });

      if (!geminiRes.ok) {
        const errText = await geminiRes.text();
        console.error('Gemini API error:', errText);
        throw new Error(`Gemini API error (${geminiRes.status})`);
      }

      const geminiData = await geminiRes.json();
      const responseContent = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || '';
      
      // Parse JSON response
      let analysis;
      try {
        // Extract JSON from response (handle markdown code blocks)
        const jsonMatch = responseContent.match(/```json\n?([\s\S]*?)\n?```/) || 
                          responseContent.match(/```\n?([\s\S]*?)\n?```/);
        const jsonStr = jsonMatch ? jsonMatch[1] : responseContent;
        analysis = JSON.parse(jsonStr.trim());
      } catch (parseError) {
        console.error('Error parsing AI response:', parseError);
        console.error('Raw response:', responseContent.substring(0, 500));
        analysis = {
          archType: 'Normal',
          pronation: 'Neutral',
          leftFootLength: 260,
          rightFootLength: 260,
          leftFootWidth: 100,
          rightFootWidth: 100,
          leftArchHeight: 25,
          rightArchHeight: 25,
          strideLength: 750,
          cadence: 110,
          biomechanicFindings: {},
          recommendations: { insoleType: 'Comfort' },
          clinicalSummary: 'AI vision analysis could not be parsed. Please review manually.',
          patientSummary: 'Your foot scan is being reviewed by our clinical team.',
          confidenceLevel: 'low',
          imageQualityNotes: 'Analysis parsing failed — manual review required.'
        };
      }
      
      // Update foot scan with analysis results
      const updatedScan = await prisma.footScan.update({
        where: { id },
        data: {
          status: 'PENDING_REVIEW',
          archType: analysis.archType,
          archIndex: analysis.archIndex || null,
          pronation: analysis.pronation,
          calcanealAlignment: analysis.calcanealAlignment || null,
          halluxValgusAngle: analysis.halluxValgusAngle || null,
          metatarsalSpread: analysis.metatarsalSpread || null,
          navicularHeight: analysis.navicularHeight || null,
          leftFootLength: analysis.leftFootLength,
          rightFootLength: analysis.rightFootLength,
          leftFootWidth: analysis.leftFootWidth,
          rightFootWidth: analysis.rightFootWidth,
          leftArchHeight: analysis.leftArchHeight,
          rightArchHeight: analysis.rightArchHeight,
          strideLength: analysis.strideLength,
          cadence: analysis.cadence,
          gaitAnalysis: analysis.gaitAnalysis,
          biomechanicData: {
            ...analysis.biomechanicFindings,
            a4Calibration: analysis.a4Calibration,
            confidenceLevel: analysis.confidenceLevel,
            imageQualityNotes: analysis.imageQualityNotes,
            shoeWearAnalysis: analysis.shoeWearAnalysis || null,
          },
          aiRecommendation: JSON.stringify({
            recommendations: analysis.recommendations,
            clinicalSummary: analysis.clinicalSummary,
            patientSummary: analysis.patientSummary,
            confidenceLevel: analysis.confidenceLevel,
            shoeWearAnalysis: analysis.shoeWearAnalysis || null,
          }),
          insoleType: analysis.recommendations?.insoleType
        },
        include: {
          patient: {
            select: { id: true, firstName: true, lastName: true, email: true }
          }
        }
      });
      
      return NextResponse.json({
        success: true,
        footScan: updatedScan,
        analysis,
        visionAnalysis: true,
        imagesAnalyzed: leftImages.length + rightImages.length,
      });
      
    } catch (aiError) {
      console.error('AI analysis error:', aiError);
      
      // Revert status if AI fails
      await prisma.footScan.update({
        where: { id },
        data: { status: 'SCANNING' }
      });
      
      return NextResponse.json({ error: 'AI vision analysis failed', details: String(aiError) }, { status: 500 });
    }
    
  } catch (error) {
    console.error('Error analyzing foot scan:', error);
    return NextResponse.json({ error: 'Failed to analyze foot scan' }, { status: 500 });
  }
}
