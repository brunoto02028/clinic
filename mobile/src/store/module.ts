import { create } from "zustand";

type ModuleKey = "lab" | "clinica" | "ba";

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
