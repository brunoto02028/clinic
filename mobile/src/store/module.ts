import { create } from "zustand";

import type { AppModule } from "@/api/modules";

// Derived from the API type rather than restated: this was a hand-written
// "lab" | "clinica" | "ba" while the endpoint also returns the studio's
// treino / avaliacoes / nutricao, so selecting one did not type-check.
type ModuleKey = AppModule["key"];

interface ModuleState {
  activeModule: ModuleKey | null;
  setActiveModule: (m: ModuleKey) => void;
  clearModule: () => void;
}

export const useModule = create<ModuleState>((set) => ({
  activeModule: null,
  setActiveModule: (m) => set({ activeModule: m }),
  clearModule: () => set({ activeModule: null }),
}));
