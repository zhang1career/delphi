import { Stack } from "expo-router";
import { useLocale } from "@/i18n/LocaleProvider";
import { useTokenRefreshInterval } from "@/lib/auth/useTokenRefreshInterval";

export default function AppGroupLayout() {
  const { t } = useLocale();
  useTokenRefreshInterval();

  const sharedHeader = {
    headerStyle: { backgroundColor: "#0f172a" },
    headerTintColor: "#f1f5f9",
    headerBackTitle: t("nav.back"),
  };

  return (
    <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: "#0f172a" } }}>
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="product-list" />
      <Stack.Screen
        name="event/[id]"
        options={{
          headerShown: true,
          title: t("screens.event"),
          ...sharedHeader,
        }}
      />
      <Stack.Screen
        name="markets/index"
        options={{
          headerShown: true,
          title: t("screens.predictions"),
          ...sharedHeader,
        }}
      />
      <Stack.Screen
        name="markets/[id]"
        options={{
          headerShown: true,
          title: t("screens.pickOutcome"),
          ...sharedHeader,
        }}
      />
      <Stack.Screen
        name="product/[id]"
        options={{
          headerShown: true,
          title: t("screens.product"),
          headerBackTitle: t("nav.back"),
        }}
      />
      <Stack.Screen
        name="leaderboard"
        options={{
          headerShown: true,
          title: t("screens.leaderboard"),
          ...sharedHeader,
        }}
      />
      <Stack.Screen name="readme" options={{ headerShown: false }} />
      <Stack.Screen
        name="order/[id]"
        options={{
          headerShown: true,
          title: t("screens.prediction"),
          headerTitleStyle: { fontWeight: "600" },
          ...sharedHeader,
        }}
      />
      <Stack.Screen
        name="checkout"
        options={{
          headerShown: true,
          title: t("screens.checkout"),
          headerBackTitle: t("nav.back"),
        }}
      />
    </Stack>
  );
}
