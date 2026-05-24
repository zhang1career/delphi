import { Platform } from "react-native";
import { Redirect } from "expo-router";
import { AboutDocumentationScreen } from "@/components/app/AboutDocumentationScreen";

/** Web: full documentation tab. Native: tab is hidden (`href: null`); this is a safe fallback. */
export default function AboutScreen() {
  if (Platform.OS !== "web") {
    return <Redirect href="/(app)/(tabs)/profile" />;
  }
  return <AboutDocumentationScreen />;
}
