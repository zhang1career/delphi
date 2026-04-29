import React, { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";

type ToastMessage = { id: number; text: string };

type ToastContextValue = {
  show: (text: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [queue, setQueue] = useState<ToastMessage[]>([]);

  const show = useCallback((text: string) => {
    const id = Date.now();
    setQueue((q) => [...q, { id, text }]);
    setTimeout(() => {
      setQueue((q) => q.filter((m) => m.id !== id));
    }, 3200);
  }, []);

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
