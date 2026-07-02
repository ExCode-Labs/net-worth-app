import { apiGet } from "@/services/api";

export interface AiInsights {
  insights: string[];
  generatedAt: string;
}

/** Plain-English spending insights, generated server-side from an aggregated
 *  summary (never raw transaction data) and cached ~6h per user. */
export function fetchAiInsights() {
  return apiGet<AiInsights>("/ai/insights");
}
