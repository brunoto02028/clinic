// Utility to match AI-generated corrective exercises with Exercise Library videos
// Fetches the library once and caches it, then fuzzy-matches by name

interface LibraryExercise {
  id: string;
  name: string;
  videoUrl: string | null;
  thumbnailUrl: string | null;
  bodyRegion: string;
}

let cachedLibrary: LibraryExercise[] | null = null;

async function fetchLibrary(): Promise<LibraryExercise[]> {
  if (cachedLibrary) return cachedLibrary;
  try {
    const res = await fetch("/api/admin/exercises?all=true");
    if (!res.ok) return [];
    const data = await res.json();
    cachedLibrary = data.exercises || [];
    return cachedLibrary!;
  } catch {
    return [];
  }
}

function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;

  // Simple word overlap
  const wordsA = a.toLowerCase().split(/\s+/);
  const wordsB = b.toLowerCase().split(/\s+/);
  const common = wordsA.filter(w => w.length > 2 && wordsB.some(wb => wb.includes(w) || w.includes(wb)));
  const score = common.length / Math.max(wordsA.length, wordsB.length);
  return score;
}

export interface EnrichedExercise {
  name: string;
  targetArea: string;
  finding: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  sets: number;
  reps: number;
  holdSeconds?: number;
  instructions: string;
  benefits: string;
  musclesTargeted: string[];
  videoUrl?: string;
  thumbnailUrl?: string;
}

export async function enrichExercisesWithVideos(
  exercises: any[]
): Promise<EnrichedExercise[]> {
  if (!exercises || exercises.length === 0) return exercises;

  const library = await fetchLibrary();
  if (library.length === 0) return exercises;

  return exercises.map((ex) => {
    // Try to find a matching library exercise
    let bestMatch: LibraryExercise | null = null;
    let bestScore = 0;

    for (const lib of library) {
      if (!lib.videoUrl) continue; // Only match if library exercise has a video
      const score = similarity(ex.name, lib.name);
      if (score > bestScore && score >= 0.5) {
        bestScore = score;
        bestMatch = lib;
      }
    }

    if (bestMatch) {
      return {
        ...ex,
        videoUrl: bestMatch.videoUrl || undefined,
        thumbnailUrl: bestMatch.thumbnailUrl || undefined,
      };
    }

    return ex;
  });
}
