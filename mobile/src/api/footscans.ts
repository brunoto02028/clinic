import { apiFetch } from "./client";

export interface FootScan {
  id: string;
  scanNumber: string;
  status: string;
  createdAt: string;
  scanUrl?: string | null;
  leftFootLength?: number | null;
  rightFootLength?: number | null;
  leftFootWidth?: number | null;
  rightFootWidth?: number | null;
  leftArchHeight?: number | null;
  rightArchHeight?: number | null;
  archType?: string | null;
  pronation?: string | null;
  halluxValgusAngle?: number | null;
  [key: string]: any;
}

export async function fetchFootScans(): Promise<FootScan[]> {
  const res = await apiFetch<FootScan[]>("/api/foot-scans");
  return Array.isArray(res) ? res : [];
}

export async function fetchFootScan(id: string): Promise<FootScan> {
  const res = await apiFetch<any>(`/api/foot-scans/${id}`);
  const scan = res?.footScan ?? res;
  if (!scan || !scan.id) throw new Error("Scan não encontrado");
  return scan as FootScan;
}
