/**
 * Tiny channel for the "link a transaction" picker screen. LedgerLink stashes the
 * expected amount + a result callback here, navigates to /pick-transaction, and
 * the picker calls `fulfill(id)` on selection. A store (not route params) because
 * the result is a callback into a still-mounted form, not serialisable data.
 */
import { create } from "zustand";

interface PickTxnState {
  /** Amount the linked txn is expected to match (for the mismatch prompt), or null. */
  expectedAmount: number | null;
  onPick: ((txnId: string) => void) | null;
  request: (expectedAmount: number | null, onPick: (txnId: string) => void) => void;
  /** Deliver the chosen transaction to the requester and clear the request. */
  fulfill: (txnId: string) => void;
  cancel: () => void;
}

export const usePickTxnStore = create<PickTxnState>((set, get) => ({
  expectedAmount: null,
  onPick: null,
  request: (expectedAmount, onPick) => set({ expectedAmount, onPick }),
  fulfill: (txnId) => {
    const cb = get().onPick;
    set({ onPick: null, expectedAmount: null });
    cb?.(txnId);
  },
  cancel: () => set({ onPick: null, expectedAmount: null }),
}));
