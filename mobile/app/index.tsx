import { Redirect } from "expo-router";
import { useAuthStore } from "@/stores/authStore";

export default function Index() {
  const accessToken = useAuthStore((s) => s.accessToken);
  if (accessToken) return <Redirect href="/(app)/(tabs)" />;
  return <Redirect href="/(auth)/login" />;
}
