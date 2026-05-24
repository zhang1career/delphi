import { Redirect } from "expo-router";

/** Deep links to `/readme` open the About tab (canonical in-app surface). */
export default function ReadmeWebRedirect() {
  return <Redirect href="/(app)/(tabs)/about" />;
}
