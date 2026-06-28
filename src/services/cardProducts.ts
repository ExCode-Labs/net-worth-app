/**
 * Card-product reference client. The canonical list lives in the backend
 * (GET /card-products); the app fetches and caches it (see store/cardProductStore),
 * falling back to the bundled constant when offline. Mirrors services/banks.ts.
 */
import { apiGet, apiEnabled } from "@/services/api";

export interface CardProductDto {
  id: string;
  name: string;
  issuer: string;
  network: string;
  type: string;
}

export async function fetchCardProducts(): Promise<CardProductDto[] | null> {
  if (!apiEnabled) return null;
  return apiGet<CardProductDto[]>("/card-products");
}
