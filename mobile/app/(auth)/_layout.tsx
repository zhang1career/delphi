import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: true,
        title: "",
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f1f5f9",
        headerShadowVisible: false,
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    />
  );
}
