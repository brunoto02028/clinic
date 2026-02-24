// ════════════════════════════════════════════════════════════════════
// Scan Utilities: Quality Checks, Voice Guide, Frame Analysis
// ════════════════════════════════════════════════════════════════════

// ─── Image Quality Assessment ───

export interface QualityResult {
  passed: boolean;
  blur: { score: number; passed: boolean; message?: string };
  brightness: { score: number; passed: boolean; message?: string };
  contrast: { score: number; passed: boolean; message?: string };
}

/**
 * Analyze image quality from a canvas element.
 * Returns blur score (Laplacian variance), brightness, and contrast.
 */
export function analyzeImageQuality(
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D
): QualityResult {
  const width = canvas.width;
  const height = canvas.height;
  const imageData = ctx.getImageData(0, 0, width, height);
  const data = imageData.data;

  // Convert to grayscale for analysis
  const gray = new Float32Array(width * height);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  // ── Blur Detection (Laplacian Variance) ──
  // Higher variance = sharper image
  let laplacianSum = 0;
  let laplacianCount = 0;
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      const laplacian =
        -4 * gray[idx] +
        gray[idx - 1] + gray[idx + 1] +
        gray[idx - width] + gray[idx + width];
      laplacianSum += laplacian * laplacian;
      laplacianCount++;
    }
  }
  const blurScore = laplacianSum / laplacianCount;
  const blurPassed = blurScore > 100; // Threshold for acceptable sharpness

  // ── Brightness Check ──
  let brightnessSum = 0;
  for (let i = 0; i < gray.length; i++) {
    brightnessSum += gray[i];
  }
  const avgBrightness = brightnessSum / gray.length;
  const brightnessPassed = avgBrightness > 40 && avgBrightness < 220;

  // ── Contrast Check ──
  let minVal = 255, maxVal = 0;
  for (let i = 0; i < gray.length; i++) {
    if (gray[i] < minVal) minVal = gray[i];
    if (gray[i] > maxVal) maxVal = gray[i];
  }
  const contrastScore = maxVal - minVal;
  const contrastPassed = contrastScore > 80;

  return {
    passed: blurPassed && brightnessPassed && contrastPassed,
    blur: {
      score: blurScore,
      passed: blurPassed,
      message: !blurPassed ? 'Image is blurry. Hold the phone steady.' : undefined,
    },
    brightness: {
      score: avgBrightness,
      passed: brightnessPassed,
      message: avgBrightness <= 40
        ? 'Too dark. Improve lighting.'
        : avgBrightness >= 220
          ? 'Too bright. Reduce light exposure.'
          : undefined,
    },
    contrast: {
      score: contrastScore,
      passed: contrastPassed,
      message: !contrastPassed ? 'Low contrast. Ensure foot is on a contrasting background.' : undefined,
    },
  };
}

/**
 * Quick blur check on a video frame (lightweight version for real-time use)
 */
export function quickBlurCheck(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D): boolean {
  // Sample a smaller region for speed
  const sampleSize = 100;
  const sx = Math.floor((canvas.width - sampleSize) / 2);
  const sy = Math.floor((canvas.height - sampleSize) / 2);
  const imageData = ctx.getImageData(sx, sy, sampleSize, sampleSize);
  const data = imageData.data;

  const gray = new Float32Array(sampleSize * sampleSize);
  for (let i = 0; i < data.length; i += 4) {
    gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
  }

  let laplacianSum = 0;
  let count = 0;
  for (let y = 1; y < sampleSize - 1; y++) {
    for (let x = 1; x < sampleSize - 1; x++) {
      const idx = y * sampleSize + x;
      const lap = -4 * gray[idx] + gray[idx - 1] + gray[idx + 1] + gray[idx - sampleSize] + gray[idx + sampleSize];
      laplacianSum += lap * lap;
      count++;
    }
  }

  return (laplacianSum / count) > 80;
}


// ─── Voice Guide ───

export class VoiceGuide {
  private synth: SpeechSynthesis | null = null;
  private enabled: boolean = true;
  private lang: string = 'en-GB';

  constructor(lang: string = 'en-GB') {
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      this.synth = window.speechSynthesis;
    }
    this.lang = lang;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.stop();
  }

  stop() {
    this.synth?.cancel();
  }

  speak(text: string, priority: boolean = false) {
    if (!this.enabled || !this.synth) return;

    if (priority) {
      this.synth.cancel();
    }

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = this.lang;
    utterance.rate = 0.9;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;

    // Try to find a good voice
    const voices = this.synth.getVoices();
    const preferred = voices.find(v => v.lang.startsWith(this.lang.split('-')[0]) && v.localService);
    if (preferred) utterance.voice = preferred;

    this.synth.speak(utterance);
  }

  // Pre-defined scan instructions
  instructIntro() {
    this.speak('Welcome to the foot scan. Please remove your shoes and socks. Make sure you have good lighting and an A4 sheet of paper nearby.', true);
  }

  instructAngle(angle: string, foot: string, mode: 'self' | 'clinician') {
    const instructions: Record<string, Record<string, string>> = {
      self: {
        plantar: `Place your ${foot} foot on the A4 paper and photograph from directly above.`,
        medial: `Now photograph the inside arch of your ${foot} foot. Hold the camera at ground level.`,
        lateral: `Photograph the outside of your ${foot} foot from the side, at ankle height.`,
        anterior: `Photograph the front of your ${foot} foot, showing the toes.`,
        posterior: `Photograph the back of your ${foot} heel from behind.`,
      },
      clinician: {
        plantar: `Capture the sole of the patient's ${foot} foot. Ensure the entire plantar surface is visible.`,
        medial: `Capture the medial arch of the ${foot} foot at ground level.`,
        lateral: `Capture the lateral side of the ${foot} foot at ankle height.`,
        anterior: `Capture the anterior view of the ${foot} foot, showing toe alignment.`,
        posterior: `Capture the posterior view of the ${foot} heel, showing calcaneal alignment.`,
        dorsal: `Capture the top of the ${foot} foot from above, showing dorsal surface.`,
        'shoe-sole': `Photograph the sole of the patient's ${foot} shoe. Show the entire sole, especially heel and forefoot wear areas.`,
      },
    };
    const text = instructions[mode]?.[angle] || `Capture the ${angle} view of the ${foot} foot.`;
    this.speak(text, true);
  }

  instructCapture() {
    this.speak('Photo captured. Looking good.');
  }

  instructRetake(reason?: string) {
    this.speak(reason || 'Please retake this photo.');
  }

  instructComplete() {
    this.speak('All photos captured. Uploading now. Please wait.', true);
  }

  instructVideoStart(foot: string) {
    this.speak(`Starting video capture. Slowly move the camera around the ${foot} foot. Keep a steady pace.`, true);
  }

  instructVideoStop() {
    this.speak('Video capture complete. Processing frames.');
  }
}


// ─── Frame Extraction from Video ───

export interface ExtractedFrame {
  blob: Blob;
  timestamp: number;
  quality: QualityResult;
  previewUrl: string;
}

/**
 * Extract the best frames from a video recording.
 * Plays the video at intervals and captures frames, filtering by quality.
 */
export async function extractBestFrames(
  videoBlob: Blob,
  targetFrames: number = 5,
  intervalMs: number = 500
): Promise<ExtractedFrame[]> {
  return new Promise((resolve) => {
    const video = document.createElement('video');
    video.src = URL.createObjectURL(videoBlob);
    video.muted = true;
    video.playsInline = true;

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    const frames: ExtractedFrame[] = [];

    video.onloadedmetadata = () => {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;

      const duration = video.duration * 1000; // ms
      const step = Math.max(intervalMs, duration / (targetFrames * 3)); // Sample 3x more than needed
      let currentTime = 0;

      const captureFrame = () => {
        if (currentTime >= duration) {
          // Sort by quality and pick best frames
          frames.sort((a, b) => b.quality.blur.score - a.quality.blur.score);
          const best = frames.slice(0, targetFrames);
          // Sort back by timestamp
          best.sort((a, b) => a.timestamp - b.timestamp);
          URL.revokeObjectURL(video.src);
          resolve(best);
          return;
        }

        video.currentTime = currentTime / 1000;
        currentTime += step;
      };

      video.onseeked = () => {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const quality = analyzeImageQuality(canvas, ctx);

        canvas.toBlob((blob) => {
          if (blob && quality.blur.passed) {
            frames.push({
              blob,
              timestamp: video.currentTime * 1000,
              quality,
              previewUrl: URL.createObjectURL(blob),
            });
          }
          captureFrame();
        }, 'image/jpeg', 0.92);
      };

      captureFrame();
    };

    video.onerror = () => {
      resolve([]);
    };
  });
}


// ─── AR Overlay SVG Paths ───

export const FOOT_OVERLAY_PATHS: Record<string, { viewBox: string; path: string; guide: string }> = {
  'plantar': {
    viewBox: '0 0 200 400',
    path: 'M100 20 C130 20 150 40 150 70 L155 140 C158 180 155 220 150 260 C147 290 140 320 130 350 C120 380 110 390 90 390 C70 390 60 380 50 360 C40 340 35 310 40 260 C45 220 38 180 42 140 L45 70 C45 40 70 20 100 20Z',
    guide: 'Place foot in the outline. Capture from directly above.',
  },
  'medial': {
    viewBox: '0 0 400 200',
    path: 'M20 160 L60 160 C80 160 100 155 130 140 C160 125 190 100 220 90 C250 80 280 85 310 95 C340 105 360 120 380 140 L380 170 L20 170Z',
    guide: 'Align the inner arch of the foot with the outline.',
  },
  'lateral': {
    viewBox: '0 0 400 200',
    path: 'M20 150 C40 145 60 140 80 135 C110 125 140 120 170 118 C200 116 230 118 260 125 C290 132 320 142 350 155 L380 165 L380 170 L20 170Z',
    guide: 'Align the outer side of the foot with the outline.',
  },
  'anterior': {
    viewBox: '0 0 200 200',
    path: 'M40 180 C40 140 50 100 60 75 C70 50 80 35 90 25 C95 20 105 20 110 25 C120 35 130 50 140 75 C150 100 160 140 160 180Z',
    guide: 'Show the front of the foot, toes facing camera.',
  },
  'posterior': {
    viewBox: '0 0 200 250',
    path: 'M60 240 L60 100 C60 60 75 30 100 20 C125 30 140 60 140 100 L140 240Z',
    guide: 'Show the back of the heel, camera at ankle height.',
  },
  'dorsal': {
    viewBox: '0 0 200 400',
    path: 'M100 30 C125 30 145 45 148 70 L150 130 C152 170 150 210 147 250 C145 280 138 310 128 340 C118 370 108 385 92 385 C76 385 66 370 56 340 C46 310 39 280 37 250 C34 210 32 170 34 130 L36 70 C39 45 60 30 100 30Z',
    guide: 'Capture the top of the foot from above.',
  },
};


// ─── Scan Step Definitions ───

export type ScanMode = 'self' | 'clinician';
export type FootSide = 'left' | 'right';

export interface ScanStepDef {
  id: string;
  foot: FootSide;
  angle: string;
  label: string;
  instruction: string;
  tip: string;
  plainDescription: string;  // patient-friendly explanation of this angle
  cameraPosition: string;    // where to hold the camera
  selfMode: boolean;    // available in self-scan mode
  clinicianMode: boolean; // available in clinician mode
  requiresAssistant: boolean; // needs another person
}

// Patient-friendly angle explanations
export const ANGLE_INFO: Record<string, { name: string; meaning: string; icon: string; position: string }> = {
  plantar: {
    name: 'Bottom View',
    meaning: 'The underside (sole) of your foot. Place your foot on the A4 paper and photograph from above.',
    icon: '👣',
    position: 'Hold camera directly above your foot, pointing down',
  },
  medial: {
    name: 'Inner Side',
    meaning: 'The inside of your foot — the side with your arch (big toe side). This shows the height of your arch.',
    icon: '🦶',
    position: 'Place camera on the floor, at the inner side of your foot',
  },
  lateral: {
    name: 'Outer Side',
    meaning: 'The outside of your foot (little toe side). Shows the outer profile of your foot.',
    icon: '🦶',
    position: 'Place camera on the floor, at the outer side of your foot',
  },
  anterior: {
    name: 'Front View',
    meaning: 'The front of your foot showing your toes. Helps check toe alignment.',
    icon: '🦶',
    position: 'Place camera on the floor in front of your toes, facing back towards you',
  },
  posterior: {
    name: 'Back View',
    meaning: 'The back of your heel and ankle. Shows heel alignment.',
    icon: '🦶',
    position: 'Place camera on the floor behind your heel, facing forward',
  },
  dorsal: {
    name: 'Top View',
    meaning: 'The top of your foot viewed from above. Shows toe shape and overall foot shape.',
    icon: '🦶',
    position: 'Hold camera above your foot, pointing straight down',
  },
  'shoe-sole': {
    name: 'Shoe Sole',
    meaning: 'The bottom of your shoe — the wear pattern reveals how you walk. Areas of heavy wear show where you put the most pressure.',
    icon: '👟',
    position: 'Turn your shoe upside down and photograph the entire sole',
  },
};

export function getScanSteps(mode: ScanMode): ScanStepDef[] {
  const allSteps: ScanStepDef[] = [
    // LEFT FOOT
    {
      id: 'left-plantar', foot: 'left', angle: 'plantar',
      label: 'Left Foot — Bottom (Plantar)',
      instruction: mode === 'clinician'
        ? 'With the patient lying down, capture the sole of the LEFT foot. Ensure the entire plantar surface and A4 paper are visible.'
        : 'Place your LEFT foot on the A4 paper. Take a photo from directly above showing the outline of your foot.',
      tip: mode === 'clinician'
        ? 'Patient supine, foot relaxed. A4 paper under or beside foot for scale.'
        : 'This captures your foot outline for sizing. Keep the paper edges visible.',
      plainDescription: 'Stand on the A4 paper and take a photo looking straight down at your foot.',
      cameraPosition: 'Hold your phone above your foot, pointing the camera straight down.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'left-sole', foot: 'left', angle: 'plantar',
      label: 'Left Foot — Sole (True Plantar)',
      instruction: 'Capture the actual SOLE of the LEFT foot. Patient with foot elevated or lying prone.',
      tip: 'This is the real sole — shows callus patterns, skin conditions, and pressure indicators. Critical for pressure analysis.',
      plainDescription: 'A close-up of the sole (underside) to check skin condition and pressure points.',
      cameraPosition: 'Patient lifts foot or lies face down. Photograph the sole directly.',
      selfMode: false, clinicianMode: true, requiresAssistant: true,
    },
    {
      id: 'left-medial', foot: 'left', angle: 'medial',
      label: 'Left Foot — Inside (Medial)',
      instruction: mode === 'clinician'
        ? 'Capture the medial arch of the LEFT foot. Camera at ground level, showing the inner arch profile.'
        : 'Photograph the INSIDE arch of your LEFT foot. Camera at ground level, pointing at the inner side.',
      tip: 'Shows arch height — crucial for insole design. Weight should be evenly distributed.',
      plainDescription: 'The inner side of your foot (big toe side) — this shows your arch height.',
      cameraPosition: 'Place your phone on the floor, pointing at the inner arch of your foot.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'left-lateral', foot: 'left', angle: 'lateral',
      label: 'Left Foot — Outside (Lateral)',
      instruction: mode === 'clinician'
        ? 'Capture the lateral side of the LEFT foot at ankle height.'
        : 'Photograph the OUTSIDE of your LEFT foot from the side at ankle height.',
      tip: 'Include from heel to toes. Stand naturally with weight evenly distributed.',
      plainDescription: 'The outer side of your foot (little toe side) — shows the outer profile.',
      cameraPosition: 'Place your phone on the floor, pointing at the outer side of your foot.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'left-anterior', foot: 'left', angle: 'anterior',
      label: 'Left Foot — Front (Anterior)',
      instruction: mode === 'clinician'
        ? 'Capture the front of the LEFT foot at toe level. Show toe alignment and forefoot.'
        : 'Photograph the FRONT of your LEFT foot, showing toes and forefoot alignment.',
      tip: 'Helps assess toe alignment.',
      plainDescription: 'The front of your foot — looking at your toes head-on.',
      cameraPosition: 'Place your phone on the floor in front of your toes, pointing back at you.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'left-posterior', foot: 'left', angle: 'posterior',
      label: 'Left Foot — Back (Posterior)',
      instruction: mode === 'clinician'
        ? 'Capture the posterior view of the LEFT heel. Camera at ankle height showing calcaneal alignment.'
        : 'Photograph the BACK of your LEFT heel/ankle from behind.',
      tip: 'Shows heel and Achilles tendon alignment.',
      plainDescription: 'The back of your heel and ankle — shows how your heel is aligned.',
      cameraPosition: 'Place your phone on the floor behind your heel, pointing forward.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'left-dorsal', foot: 'left', angle: 'dorsal',
      label: 'Left Foot — Top (Dorsal)',
      instruction: 'Capture the top of the LEFT foot from directly above, showing the dorsal surface.',
      tip: 'Shows toe shape and overall foot shape from above.',
      plainDescription: 'The top of your foot — looking down at it from above.',
      cameraPosition: 'Hold your phone above the top of your foot, pointing straight down.',
      selfMode: false, clinicianMode: true, requiresAssistant: false,
    },
    // RIGHT FOOT
    {
      id: 'right-plantar', foot: 'right', angle: 'plantar',
      label: 'Right Foot — Bottom (Plantar)',
      instruction: mode === 'clinician'
        ? 'Capture the sole outline of the RIGHT foot on A4 paper.'
        : 'Place your RIGHT foot on the A4 paper. Photo from directly above.',
      tip: 'Same setup as left foot. Keep the paper fully visible for accurate scaling.',
      plainDescription: 'Stand on the A4 paper and take a photo looking straight down at your foot.',
      cameraPosition: 'Hold your phone above your foot, pointing the camera straight down.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-sole', foot: 'right', angle: 'plantar',
      label: 'Right Foot — Sole (True Plantar)',
      instruction: 'Capture the actual SOLE of the RIGHT foot. Patient with foot elevated.',
      tip: 'Match the same setup as left foot sole capture.',
      plainDescription: 'A close-up of the sole (underside) to check skin condition and pressure points.',
      cameraPosition: 'Patient lifts foot or lies face down. Photograph the sole directly.',
      selfMode: false, clinicianMode: true, requiresAssistant: true,
    },
    {
      id: 'right-medial', foot: 'right', angle: 'medial',
      label: 'Right Foot — Inside (Medial)',
      instruction: mode === 'clinician'
        ? 'Capture the medial arch of the RIGHT foot at ground level.'
        : 'Photograph the INSIDE arch of your RIGHT foot from ground level.',
      tip: 'Match the same distance and angle as the left foot.',
      plainDescription: 'The inner side of your foot (big toe side) — this shows your arch height.',
      cameraPosition: 'Place your phone on the floor, pointing at the inner arch of your foot.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-lateral', foot: 'right', angle: 'lateral',
      label: 'Right Foot — Outside (Lateral)',
      instruction: mode === 'clinician'
        ? 'Capture the lateral side of the RIGHT foot at ankle height.'
        : 'Photograph the OUTSIDE of your RIGHT foot from the side.',
      tip: 'Same height and distance as the left foot.',
      plainDescription: 'The outer side of your foot (little toe side) — shows the outer profile.',
      cameraPosition: 'Place your phone on the floor, pointing at the outer side of your foot.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-anterior', foot: 'right', angle: 'anterior',
      label: 'Right Foot — Front (Anterior)',
      instruction: mode === 'clinician'
        ? 'Capture the anterior view of the RIGHT foot.'
        : 'Photograph the FRONT of your RIGHT foot, showing toes.',
      tip: 'Same setup as the left foot anterior view.',
      plainDescription: 'The front of your foot — looking at your toes head-on.',
      cameraPosition: 'Place your phone on the floor in front of your toes, pointing back at you.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-posterior', foot: 'right', angle: 'posterior',
      label: 'Right Foot — Back (Posterior)',
      instruction: mode === 'clinician'
        ? 'Capture the posterior view of the RIGHT heel.'
        : 'Photograph the BACK of your RIGHT heel/ankle from behind.',
      tip: 'Same setup as the left foot posterior view.',
      plainDescription: 'The back of your heel and ankle — shows how your heel is aligned.',
      cameraPosition: 'Place your phone on the floor behind your heel, pointing forward.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-dorsal', foot: 'right', angle: 'dorsal',
      label: 'Right Foot — Top (Dorsal)',
      instruction: 'Capture the top of the RIGHT foot from directly above.',
      tip: 'Shows the top surface and overall foot shape.',
      plainDescription: 'The top of your foot — looking down at it from above.',
      cameraPosition: 'Hold your phone above the top of your foot, pointing straight down.',
      selfMode: false, clinicianMode: true, requiresAssistant: false,
    },
    // ── SHOE WEAR ANALYSIS ──
    {
      id: 'left-shoe-sole', foot: 'left', angle: 'shoe-sole',
      label: 'Left Shoe — Sole Wear Pattern',
      instruction: mode === 'clinician'
        ? 'Photograph the sole of the patient\'s LEFT shoe. Ensure the entire sole is visible, especially the heel and forefoot areas.'
        : 'Turn your LEFT shoe upside down and take a photo of the entire sole. This shows your walking pattern.',
      tip: 'Wear patterns reveal gait habits: medial wear = overpronation, lateral wear = supination, even wear = neutral gait.',
      plainDescription: 'The bottom of your left shoe — the wear pattern shows how you walk.',
      cameraPosition: 'Place the shoe sole-up on a flat surface. Photograph from directly above.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
    {
      id: 'right-shoe-sole', foot: 'right', angle: 'shoe-sole',
      label: 'Right Shoe — Sole Wear Pattern',
      instruction: mode === 'clinician'
        ? 'Photograph the sole of the patient\'s RIGHT shoe. Same setup as the left shoe.'
        : 'Turn your RIGHT shoe upside down and take a photo of the entire sole.',
      tip: 'Compare wear between left and right shoes for asymmetry detection.',
      plainDescription: 'The bottom of your right shoe — compare wear with the left shoe.',
      cameraPosition: 'Place the shoe sole-up on a flat surface. Photograph from directly above.',
      selfMode: true, clinicianMode: true, requiresAssistant: false,
    },
  ];

  return allSteps.filter(step =>
    mode === 'self' ? step.selfMode : step.clinicianMode
  );
}
