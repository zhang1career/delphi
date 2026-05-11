import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { NativeWindStyleSheet } from "nativewind";
import { useEffect, useMemo, useState } from "react";
import { Platform, type ViewStyle } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AuthHydrationGate } from "@/lib/auth/AuthHydrationGate";
import { PostLoginReturnTracker } from "@/lib/auth/PostLoginReturnTracker";
import { NotificationBarProvider } from "@zhang1career/notifications";
import { ToastProvider } from "@/lib/notifications/toast";
import { initServiceOrigins } from "@/lib/serviceOrigins";

/** RN Web defaults to NativeWind "css" output; with Expo Metro it leaves utilities inert (no rules for `.bg-brand`). */
if (Platform.OS === "web") {
  NativeWindStyleSheet.setOutput({ web: "native", default: "native" });
}

export default function RootLayout() {
  const queryClient = useMemo(() => new QueryClient(), []);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (Platform.OS !== "web" || typeof document === "undefined") {
      return;
    }
    const prevBodyMargin = document.body.style.margin;
    document.body.style.margin = "0";
    return () => {
      document.body.style.margin = prevBodyMargin;
    };
  }, []);

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
    <GestureHandlerRootView
      style={{
        flex: 1,
        backgroundColor: "#0f172a",
        ...(Platform.OS === "web"
          ? ({ minHeight: "100vh" } as unknown as ViewStyle)
          : {}),
      }}
    >
      <SafeAreaProvider>
        <QueryClientProvider client={queryClient}>
          <NotificationBarProvider>
            <ToastProvider>
              <AuthHydrationGate>
              <PostLoginReturnTracker />
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
          </NotificationBarProvider>
        </QueryClientProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
