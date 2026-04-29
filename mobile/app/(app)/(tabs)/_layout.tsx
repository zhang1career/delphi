import { Tabs } from "expo-router";
import Ionicons from "@expo/vector-icons/Ionicons";
import { BetTabBar } from "./BetTabBar";
import { features } from "@/lib/config";

export default function TabLayout() {
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
          title: "Sports",
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
          title: "Cart",
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
          title: "Orders",
          /** Nested `orders/[id]` stack: hide tab header so there is no Back row; list uses in-screen title. */
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
          title: "Profile",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="person-circle-outline" color={color} size={size} />
          ),
        }}
      />
    </Tabs>
  );
}
