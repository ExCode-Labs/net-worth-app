/**
 * Bank reference-list client. The canonical Indian-bank list lives in the
 * backend (GET /banks); the app fetches it and caches it (see store/bankStore),
 * falling back to the bundled constant when offline or no backend is configured.
 */
import { apiGet, apiEnabled } from "@/services/api";

export interface BankDto {
  code: string;
  name: string;
  ifscLength: number;
  acctMin: number;
  acctMax: number;
  acctExample: string | null;
  category: string;
}

export async function fetchBanks(): Promise<BankDto[] | null> {
  if (!apiEnabled) return null;
  return apiGet<BankDto[]>("/banks");
}
