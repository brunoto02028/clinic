import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth-options";
import { prisma } from "@/lib/db";
import { getConfigValue } from "@/lib/system-config";

async function imageToBase64(url: string): Promise<string | null> {
  try {
    if (url.startsWith("data:")) return url;
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const contentType = response.headers.get("content-type") || "image/jpeg";
    return `data:${contentType};base64,${base64}`;
  } catch {
    return null;
  }
}

function buildAnalysisPrompt(): string {
  return `You are an expert biomechanical assessment specialist and physiotherapist. Analyze the provided body images (frontal, posterior, left lateral, right lateral views) and provide a comprehensive biomechanical assessment.

For each image, identify and evaluate:

1. **POSTURE ANALYSIS**:
   - Head position (forward head posture, lateral tilt)
   - Shoulder level and symmetry
   - Thoracic spine (kyphosis assessment)
   - Lumbar spine (lordosis assessment)
   - Pelvic tilt (anterior/posterior/lateral)
   - Knee alignment (valgus/varus/recurvatum)
   - Ankle/foot alignment

2. **MOTOR POINTS MAPPING**:
   For each identified motor point, provide: name, body region, status (normal/hypertonic/hypotonic/trigger_point), severity (0-10), and clinical notes.
   Key motor points to assess: upper trapezius, levator scapulae, SCM, pectorals, rhomboids, latissimus dorsi, erector spinae, quadratus lumborum, gluteus maximus/medius/minimus, piriformis, hip flexors (iliopsoas), quadriceps, hamstrings, adductors, TFL/ITB, gastrocnemius/soleus, tibialis anterior.

3. **SYMMETRY ANALYSIS**:
   - Left vs right comparison for each body region
   - Asymmetry percentage scores

4. **JOINT ANGLES** (estimated from images):
   - Cervical angle, shoulder angles, thoracic kyphosis angle, lumbar lordosis angle, hip angles, knee angles, ankle angles

5. **ALIGNMENT DATA**:
   - Plumb line deviations (frontal and sagittal)
   - Shoulder level difference (mm estimated)
   - Hip level difference (mm estimated)
   - Knee alignment angles

6. **KINETIC CHAIN ANALYSIS**:
   - Identified compensatory patterns
   - Cause-effect relationships
   - Primary dysfunction areas

7. **MOVEMENT PATTERN ANALYSIS** (if movement test data/videos are provided):
   - **Squat**: depth, knee tracking (valgus/varus), trunk lean, heel rise, weight shift, overall quality (1-10)
   - **Gait**: stride symmetry, arm swing, trunk rotation, foot strike pattern, lateral sway, cadence assessment
   - **Overhead Squat**: arm drift, thoracic mobility, compensations
   - **Single Leg Balance**: time held, trunk sway, hip drop (Trendelenburg), ankle strategy vs hip strategy
   - **Lunge**: knee stability, trunk alignment, step length symmetry
   - **Hip Hinge**: hamstring flexibility, lumbar flexion control, hip-to-spine ratio

8. **SCORES** (0-100, where 100 is perfect):
   - postureScore
   - symmetryScore
   - mobilityScore (based on visible restrictions and movement quality)
   - overallScore

Return your analysis as a JSON object with this exact structure:
{
  "postureAnalysis": {
    "frontalPlane": { "headTilt": "", "shoulderLevel": "", "hipLevel": "", "kneeAlignment": "", "overallFrontal": "" },
    "sagittalPlane": { "headForward": "", "thoracicKyphosis": "", "lumbarLordosis": "", "pelvicTilt": "", "kneePosition": "", "overallSagittal": "" },
    "summary": ""
  },
  "motorPoints": [
    { "id": "1", "name": "Upper Trapezius R", "bodyRegion": "shoulder", "x": 0.65, "y": 0.15, "status": "hypertonic", "severity": 7, "notes": "Elevated, increased tone" }
  ],
  "symmetryAnalysis": {
    "shoulders": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "hips": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "knees": { "left": "", "right": "", "asymmetryPercent": 0, "notes": "" },
    "overall": { "asymmetryScore": 0, "dominantSide": "", "notes": "" }
  },
  "jointAngles": {
    "cervical": { "flexion": 0, "lateralTilt": 0 },
    "shoulders": { "left": { "elevation": 0, "protraction": 0 }, "right": { "elevation": 0, "protraction": 0 } },
    "thoracic": { "kyphosisAngle": 0 },
    "lumbar": { "lordosisAngle": 0 },
    "hips": { "left": { "flexion": 0, "tilt": 0 }, "right": { "flexion": 0, "tilt": 0 } },
    "knees": { "left": { "valgus": 0, "flexion": 0 }, "right": { "valgus": 0, "flexion": 0 } },
    "ankles": { "left": { "dorsiflexion": 0 }, "right": { "dorsiflexion": 0 } }
  },
  "alignmentData": {
    "plumbLineFrontal": { "deviations": [], "overallShift": "" },
    "plumbLineSagittal": { "deviations": [], "overallShift": "" },
    "shoulderLevelDiff": 0,
    "hipLevelDiff": 0,
    "kneeLevelDiff": 0
  },
  "kineticChain": {
    "compensations": [{ "area": "", "pattern": "", "likelyCause": "", "affectedAreas": [] }],
    "primaryDysfunction": "",
    "secondaryDysfunctions": []
  },
  "movementPatterns": {
    "squat": { "depth": "", "kneeTracking": "", "trunkLean": "", "heelRise": false, "weightShift": "", "quality": 0, "compensations": [], "notes": "" },
    "gait": { "strideSymmetry": "", "armSwing": "", "trunkRotation": "", "footStrike": "", "lateralSway": "", "cadence": "", "notes": "" },
    "overheadSquat": { "armDrift": "", "thoracicMobility": "", "compensations": [], "notes": "" },
    "singleLegBalance": { "left": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" }, "right": { "timeHeld": 0, "trunkSway": "", "hipDrop": "", "strategy": "" } },
    "lunge": { "kneeStability": "", "trunkAlignment": "", "stepLengthSymmetry": "", "notes": "" },
    "hipHinge": { "hamstringFlexibility": "", "lumbarControl": "", "hipSpineRatio": "", "notes": "" }
  },
  "scores": {
    "postureScore": 0,
    "symmetryScore": 0,
    "mobilityScore": 0,
    "overallScore": 0
  },
  "findings": [
    { "area": "", "finding": "", "severity": "mild|moderate|severe", "recommendation": "" }
  ],
  "summary": "",
  "recommendations": ""
}

Be thorough and clinical. Use proper anatomical terminology. Base severity scores on visible evidence only.`;
}

// POST - Run AI analysis on body assessment
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const assessment = await (prisma as any).bodyAssessment.findUnique({
      where: { id: params.id },
    });

    if (!assessment) {
      return NextResponse.json({ error: "Assessment not found" }, { status: 404 });
    }

    // Collect all available images
    const imageUrls: string[] = [];
    const imageLabels: string[] = [];

    if (assessment.frontImageUrl) {
      imageUrls.push(assessment.frontImageUrl);
      imageLabels.push("FRONTAL VIEW");
    }
    if (assessment.backImageUrl) {
      imageUrls.push(assessment.backImageUrl);
      imageLabels.push("POSTERIOR VIEW");
    }
    if (assessment.leftImageUrl) {
      imageUrls.push(assessment.leftImageUrl);
      imageLabels.push("LEFT LATERAL VIEW");
    }
    if (assessment.rightImageUrl) {
      imageUrls.push(assessment.rightImageUrl);
      imageLabels.push("RIGHT LATERAL VIEW");
    }

    if (imageUrls.length === 0) {
      return NextResponse.json(
        { error: "No images available for analysis. Please capture images first." },
        { status: 400 }
      );
    }

    // Update status to analyzing
    await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: { status: "ANALYZING" },
    });

    // Collect landmark data for enhanced analysis
    const landmarkInfo: string[] = [];
    if (assessment.frontLandmarks) landmarkInfo.push(`Front landmarks: ${JSON.stringify(assessment.frontLandmarks)}`);
    if (assessment.backLandmarks) landmarkInfo.push(`Back landmarks: ${JSON.stringify(assessment.backLandmarks)}`);
    if (assessment.leftLandmarks) landmarkInfo.push(`Left landmarks: ${JSON.stringify(assessment.leftLandmarks)}`);
    if (assessment.rightLandmarks) landmarkInfo.push(`Right landmarks: ${JSON.stringify(assessment.rightLandmarks)}`);

    // Build Gemini request with vision
    const geminiKey = await getConfigValue('GEMINI_API_KEY') || process.env.GEMINI_API_KEY;
    if (!geminiKey) {
      return NextResponse.json({ error: "GEMINI_API_KEY not configured" }, { status: 500 });
    }
    const geminiModel = (await getConfigValue('GEMINI_MODEL')) || 'gemini-2.0-flash';
    const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${geminiModel}:generateContent?key=${geminiKey}`;

    const parts: any[] = [
      { text: "You are a biomechanical assessment AI. Always respond with valid JSON only, no markdown formatting or code blocks.\n\n" + buildAnalysisPrompt() },
    ];

    for (let i = 0; i < imageUrls.length; i++) {
      parts.push({ text: `\n--- ${imageLabels[i]} ---` });
      const base64 = await imageToBase64(imageUrls[i]);
      if (base64) {
        const match = base64.match(/^data:(.+?);base64,(.+)$/);
        if (match) {
          parts.push({ inlineData: { mimeType: match[1], data: match[2] } });
        }
      }
    }

    if (landmarkInfo.length > 0) {
      parts.push({ text: `\n--- POSE DETECTION LANDMARKS (MediaPipe BlazePose) ---\n${landmarkInfo.join("\n")}` });
    }

    if (assessment.movementVideos && Array.isArray(assessment.movementVideos) && assessment.movementVideos.length > 0) {
      const videoInfo = assessment.movementVideos.map((v: any) => 
        `- ${v.label || v.testType}: ${v.duration}s recorded`
      ).join("\n");
      parts.push({ text: `\n--- MOVEMENT TESTS RECORDED ---\n${videoInfo}` });
    }

    const geminiRes = await fetch(geminiUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { temperature: 0.3, maxOutputTokens: 8000 },
      }),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", errText);
      throw new Error(`Gemini API error (${geminiRes.status})`);
    }

    const geminiData = await geminiRes.json();
    const responseText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Parse JSON from response
    let analysisData: any = {};
    try {
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysisData = JSON.parse(jsonMatch[0]);
      }
    } catch (parseError) {
      console.error("Failed to parse AI response:", parseError);
      analysisData = { rawResponse: responseText };
    }

    // Update assessment with AI results
    const updated = await (prisma as any).bodyAssessment.update({
      where: { id: params.id },
      data: {
        postureAnalysis: analysisData.postureAnalysis || null,
        symmetryAnalysis: analysisData.symmetryAnalysis || null,
        jointAngles: analysisData.jointAngles || null,
        alignmentData: analysisData.alignmentData || null,
        movementPatterns: analysisData.movementPatterns || null,
        kineticChain: analysisData.kineticChain || null,
        motorPoints: analysisData.motorPoints || null,
        postureScore: analysisData.scores?.postureScore || null,
        symmetryScore: analysisData.scores?.symmetryScore || null,
        mobilityScore: analysisData.scores?.mobilityScore || null,
        overallScore: analysisData.scores?.overallScore || null,
        aiSummary: analysisData.summary || null,
        aiRecommendations: analysisData.recommendations || null,
        aiFindings: analysisData.findings || null,
        aiProcessedAt: new Date(),
        status: "PENDING_REVIEW",
      },
      include: {
        patient: {
          select: { id: true, firstName: true, lastName: true, email: true },
        },
        therapist: {
          select: { id: true, firstName: true, lastName: true },
        },
      },
    });

    return NextResponse.json(updated);
  } catch (error) {
    console.error("Error analyzing body assessment:", error);

    // Revert status on failure
    try {
      await (prisma as any).bodyAssessment.update({
        where: { id: params.id },
        data: { status: "PENDING_ANALYSIS" },
      });
    } catch {}

    return NextResponse.json(
      { error: "Failed to analyze body assessment" },
      { status: 500 }
    );
  }
}
