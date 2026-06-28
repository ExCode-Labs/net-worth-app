/**
 * Cached card-product reference list. Seeded from the bundled constant, refreshed
 * from the backend (GET /card-products) on launch, and persisted so the picker
 * works offline. Mirrors store/bankStore.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { CARD_PRODUCTS, type CardProduct } from "@/constants/cardProducts";
import { fetchCardProducts } from "@/services/cardProducts";

interface CardProductStore {
  products: CardProduct[];
  refresh: () => Promise<void>;
}

export const useCardProductStore = create<CardProductStore>()(
  persist(
    (set) => ({
      products: CARD_PRODUCTS,

      refresh: async () => {
        try {
          const rows = await fetchCardProducts();
          if (rows && rows.length) {
            set({
              products: rows.map((c) => ({
                id: c.id,
                name: c.name,
                issuer: c.issuer,
                network: c.network,
                type: c.type,
              })),
            });
          }
        } catch {
          // Keep the cached / bundled list on any failure.
        }
      },
    }),
    {
      name: "card-product-store",
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (s) => ({ products: s.products }),
    },
  ),
);
