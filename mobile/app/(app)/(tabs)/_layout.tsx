import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { Platform } from "react-native";
import { useLocale } from "@/i18n/LocaleProvider";
import { BetTabBar } from "@/lib/navigation/BetTabBar";
import { features } from "@/lib/config";

export default function TabLayout() {
  const { t } = useLocale();

  return (
    <Tabs
      tabBar={(props) => <BetTabBar {...props} />}
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f1f5f9",
        tabBarStyle: { backgroundColor: "#1e293b", borderTopColor: "#334155" },
        tabBarActiveTintColor: "#a5b4fc",
        tabBarInactiveTintColor: "#64748b",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t("tabs.events"),
          tabBarLabel: t("tabs.events"),
          headerShown: false,
          href: features.commerce ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="american-football-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="cart"
        options={{
          title: t("tabs.cart"),
          tabBarLabel: t("tabs.cart"),
          headerShown: false,
          href: features.cart ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="cart-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: t("tabs.predictions"),
          tabBarLabel: t("tabs.predictions"),
          headerShown: false,
          href: features.orders ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="receipt-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: t("tabs.profile"),
          tabBarLabel: t("tabs.profile"),
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: t("tabs.about"),
          tabBarLabel: t("tabs.about"),
          headerShown: false,
          href: Platform.OS === "web" ? undefined : null,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="information-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
