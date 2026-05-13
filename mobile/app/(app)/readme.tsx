import { Redirect } from "expo-router";

/**
 * iOS/Android fallback for the web-only deploy readme route (`readme.web.tsx`).
 * Metro requires this file next to `readme.web.tsx`; native builds should not surface this screen in UI.
 */
export default function ReadmeNativeFallback() {
  return <Redirect href="/(app)/(tabs)/profile" />;
}
