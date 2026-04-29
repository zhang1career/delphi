import { Stack } from "expo-router";

/**
 * Example route groups — copy patterns into your own `app/` trees.
 * Feature flags for the main app live in `app.json` → `expo.extra.features`.
 */
export default function ExamplesLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: { backgroundColor: "#0f172a" },
        headerTintColor: "#f1f5f9",
        contentStyle: { backgroundColor: "#0f172a" },
      }}
    />
  );
}
