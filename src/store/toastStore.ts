import { create } from "zustand";

export type ToastType = "success" | "error" | "info";

interface ToastStore {
  visible: boolean;
  message: string;
  type: ToastType;
  show: (message: string, type?: ToastType) => void;
  hide: () => void;
}

let _timer: ReturnType<typeof setTimeout> | null = null;

export const useToastStore = create<ToastStore>((set) => ({
  visible: false,
  message: "",
  type: "info",

  show: (message, type = "info") => {
    if (_timer) clearTimeout(_timer);
    set({ visible: true, message, type });
    _timer = setTimeout(() => useToastStore.getState().hide(), 3500);
  },

  hide: () => set({ visible: false }),
}));

/** Call from anywhere outside React — event handlers, stores, async fns. */
export const toast = {
  success: (msg: string) => useToastStore.getState().show(msg, "success"),
  error:   (msg: string) => useToastStore.getState().show(msg, "error"),
  info:    (msg: string) => useToastStore.getState().show(msg, "info"),
};
