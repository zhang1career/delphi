import { useRouter } from "expo-router";
import { Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { clearSession } from "@/lib/auth/sessionLifecycle";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const user = useAuthStore((s) => s.user);

  return (
    <View className="flex-1 bg-surface px-4" style={{ paddingTop: insets.top + 16 }}>
      <Text className="text-xl font-bold text-slate-100 mb-6">Profile</Text>
      <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
        <Text className="text-slate-500 text-xs">Signed in as</Text>
        <Text className="text-slate-100 text-lg mt-1">{user?.email || user?.username || "—"}</Text>
      </View>
      <Text className="text-slate-500 text-xs uppercase tracking-wide mb-2">Recipes</Text>
      <Button
        title="Commerce-only layout"
        variant="ghost"
        className="mb-2"
        onPress={() => router.push("/(examples)/commerce")}
      />
      <Button
        title="Feed-only layout"
        variant="ghost"
        onPress={() => router.push("/(examples)/feed-only")}
      />
      <View className="mt-8">
        <Button title="Sign out" variant="ghost" onPress={() => void clearSession()} />
      </View>
    </View>
  );
}
