import { apiFetch } from "./client";

export interface AppModule {
  key: "lab" | "clinica" | "ba";
  name: string;
  icon: string;
  description: string;
}

export async function fetchModules(): Promise<AppModule[]> {
  return apiFetch<AppModule[]>("/api/mobile/modules");
}
