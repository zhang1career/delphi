import { Stack } from "expo-router";

export default function CommerceRecipeLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f1f5f9",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    >
      <Stack.Screen name="index" options={{ title: "Commerce recipe" }} />
      <Stack.Screen name="product/[id]" options={{ title: "Product" }} />
    </Stack>
  );
}
