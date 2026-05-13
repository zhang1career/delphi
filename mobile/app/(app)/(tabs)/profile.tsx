import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";
import { Button } from "@/components/ui/Button";
import { useBetReputationQuery } from "@/features/bet/hooks";
import { clearSession } from "@/lib/auth/sessionLifecycle";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const webNavTop = useWebTopTabBarInset();
  const user = useAuthStore((s) => s.user);
  const token = useAuthStore((s) => s.accessToken);
  const {
    data: reputation,
    isError: reputationError,
    isFetching: reputationFetching,
    refetch: refetchReputation,
  } = useBetReputationQuery();

  useFocusEffect(
    useCallback(() => {
      if (!token) {
        return;
      }
      void refetchReputation();
    }, [token, refetchReputation]),
  );

  const score = reputation?.score ?? 0;
  const showReputationValue = !!token;

  return (
    <View
      className="flex-1 bg-surface px-4"
      style={{ paddingTop: Platform.OS === "web" ? webNavTop + 16 : insets.top + 16 }}
    >
      <Text className="text-xl font-bold text-slate-100 mb-6">Profile</Text>
      <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
        <Text className="text-slate-500 text-xs">Signed in as</Text>
        <Text className="text-slate-100 text-lg mt-1">{user?.email || user?.username || "—"}</Text>
      </View>
      <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
        <Text className="text-slate-500 text-xs">Reputation (skill track record)</Text>
        <View className="flex-row items-center justify-between mt-1 min-h-[28px]">
          {reputationError && !reputation ? (
            <>
              <Text className="text-slate-400 text-sm">Could not load</Text>
              <Pressable onPress={() => void refetchReputation()} hitSlop={8} className="py-1">
                <Text className="text-indigo-400 text-sm font-medium">Retry</Text>
              </Pressable>
            </>
          ) : reputationFetching && !reputation ? (
            <ActivityIndicator color="#94a3b8" size="small" />
          ) : !showReputationValue ? (
            <Text className="text-slate-500 text-sm">Sign in to see reputation</Text>
          ) : (
            <Text className="text-slate-100 text-lg font-semibold">{score}</Text>
          )}
        </View>
      </View>
      <Button
        title="Leaderboard"
        className="mb-4"
        onPress={() => router.push("/(app)/leaderboard")}
      />
      {Platform.OS === "web" && (
        <Button
          title="Deploy readme"
          className="mb-4"
          variant="ghost"
          onPress={() => router.push("/(app)/readme")}
        />
      )}
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
