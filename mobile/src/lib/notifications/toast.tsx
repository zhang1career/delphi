import { useNotificationBar } from "@zhang1career/notifications";
import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type ToastMessage = { id: number; text: string };

export type ToastShowOptions = {
  /**
   * `"error"` uses the top notification bar (from `@zhang1career/notifications`).
   * Default keeps the compact bottom toast.
   */
  variant?: "default" | "error";
};

type ToastContextValue = {
  show: (text: string, options?: ToastShowOptions) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const notificationBar = useNotificationBar();
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const show = useCallback(
    (text: string, options?: ToastShowOptions) => {
      if (options?.variant === "error") {
        notificationBar.show(text, { variant: "error" });
        return;
      }
      const id = Date.now();
      setQueue((q) => [...q, { id, text }]);
      setTimeout(() => {
        setQueue((q) => q.filter((m) => m.id !== id));
      }, 3200);
    },
    [notificationBar],
  );

  const value = useMemo(() => ({ show }), [show]);

  const active = queue[0];

  return (
    <ToastContext.Provider value={value}>
      {children}
      {active ? (
        <View
          className="absolute bottom-24 left-4 right-4 z-50 rounded-xl bg-surface-card px-4 py-3 border border-surface-border"
          pointerEvents="box-none"
        >
          <Pressable onPress={() => setQueue((q) => q.filter((m) => m.id !== active.id))}>
            <Text className="text-slate-100 text-center text-sm">{active.text}</Text>
          </Pressable>
        </View>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast requires ToastProvider");
  return ctx;
}
