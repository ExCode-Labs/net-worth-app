import { create } from "zustand";

export interface ConfirmOptions {
  title: string;
  message?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmStore {
  visible: boolean;
  options: ConfirmOptions | null;
  show: (options: ConfirmOptions) => void;
  /** Run the confirm action and close. */
  accept: () => void;
  /** Dismiss without acting (backdrop / cancel button). */
  dismiss: () => void;
}

export const useConfirmStore = create<ConfirmStore>((set, get) => ({
  visible: false,
  options: null,

  show: (options) => set({ visible: true, options }),

  accept: () => {
    get().options?.onConfirm();
    set({ visible: false });
  },

  dismiss: () => {
    get().options?.onCancel?.();
    set({ visible: false });
  },
}));

/** Imperative confirm dialog — call from anywhere, like `toast`. */
export function confirm(options: ConfirmOptions): void {
  useConfirmStore.getState().show(options);
}
