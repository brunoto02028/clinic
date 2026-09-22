import { apiFetch } from "./client";

export interface AppModule {
  // `nutricao` was missing though the endpoint returns it for studios.
  key: "lab" | "clinica" | "ba" | "treino" | "avaliacoes" | "nutricao";
  name: string;
  icon: string;
  description: string;
}

export async function fetchModules(): Promise<AppModule[]> {
  return apiFetch<AppModule[]>("/api/mobile/modules");
}
