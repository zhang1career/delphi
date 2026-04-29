import { Redirect, Stack } from "expo-router";
import { useTokenRefreshInterval } from "@/lib/auth/useTokenRefreshInterval";
import { useAuthStore } from "@/stores/authStore";

export default function AppGroupLayout() {
  const accessToken = useAuthStore((s) => s.accessToken);
  useTokenRefreshInterval();
  if (!accessToken) return <Redirect href="/(auth)/login" />;
  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product-list" />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          title: "Event",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
        }}
      />
      <Stack.Screen
        name="market/[id]"
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          title: "Market",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{ headerShown: true, title: "Product", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: true,
          title: "Order",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
          headerTitleStyle: { fontWeight: "600" },
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{ headerShown: true, title: "Checkout", headerBackTitle: "Back" }}
      />
    </Stack>
  );
}
