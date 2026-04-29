import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect, useMemo, useState } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthHydrationGate } from "@/lib/auth/AuthHydrationGate";
import { ToastProvider } from "@/lib/notifications/toast";
import { initServiceOrigins } from "@/lib/serviceOrigins";

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    initServiceOrigins()
      .catch((err) => {
        console.error("initServiceOrigins failed", err);
      })
      .finally(() => {
        if (mounted) {
          setReady(true);
        }
      });
    return () => {
      mounted = false;
    };
  }, []);

  if (!ready) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1, backgroundColor: "#0f172a" }}>
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <ToastProvider>
            <AuthHydrationGate>
              <Stack
                screenOptions={{
                  headerStyle: { backgroundColor: "#0f172a" },
                  headerTintColor: "#f1f5f9",
                  headerTitleStyle: { fontWeight: "600" },
                  contentStyle: { backgroundColor: "#0f172a" },
                }}
              >
                <Stack.Screen name="(auth)" options={{ title: "" }} />
                <Stack.Screen name="(app)" options={{ headerShown: false }} />
              </Stack>
            </AuthHydrationGate>
          </ToastProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
