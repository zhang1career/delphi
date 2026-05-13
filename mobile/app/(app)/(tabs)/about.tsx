import { Redirect } from "expo-router";

/** About tab is web-only (`href: null` on native); this file satisfies Metro’s platform pair. */
export default function AboutNativeFallback() {
  return <Redirect href="/(app)/(tabs)/profile" />;
}
