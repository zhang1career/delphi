import { Stack } from "expo-router";
import { Platform } from "react-native";
import { useTokenRefreshInterval } from "@/lib/auth/useTokenRefreshInterval";

export default function AppGroupLayout() {
  useTokenRefreshInterval();
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
        name="markets/index"
        options={{
          headerShown: true,
          title: "Predictions",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
        }}
      />
      <Stack.Screen
        name="markets/[id]"
        options={{
          headerShown: true,
          headerBackTitle: "Back",
          title: "Pick outcome",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{ headerShown: true, title: "Product", headerBackTitle: "Back" }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: "Leaderboard",
          headerBackTitle: "Back",
          headerStyle: { backgroundColor: "#0f172a" },
          headerTintColor: "#f1f5f9",
        }}
      />
      {Platform.OS === "web" && (
        <Stack.Screen
          name="readme"
          options={{
            headerShown: true,
            title: "Readme",
            headerBackTitle: "Back",
            headerStyle: { backgroundColor: "#0f172a" },
            headerTintColor: "#f1f5f9",
          }}
        />
      )}
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: true,
          title: "Prediction",
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
