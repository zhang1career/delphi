import { useFocusEffect } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useCallback } from "react";
import { ActivityIndicator, Platform, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { useBetReputationQuery } from "@/features/bet/hooks";
import { useLocale } from "@/i18n/LocaleProvider";
import { clearSession } from "@/lib/auth/sessionLifecycle";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";
import { useAuthStore } from "@/stores/authStore";

export default function ProfileScreen() {
  const router = useRouter();
  const { t } = useLocale();
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
      <Text className="text-xl font-bold text-slate-100 mb-6">{t("profile.title")}</Text>
      <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
        <Text className="text-slate-500 text-xs">{t("profile.signedInAs")}</Text>
        <Text className="text-slate-100 text-lg mt-1">{user?.email || user?.username || t("common.emDash")}</Text>
      </View>
      <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-4">
        <Text className="text-slate-500 text-xs">{t("profile.reputation")}</Text>
        <View className="flex-row items-center justify-between mt-1 min-h-[28px]">
          {reputationError && !reputation ? (
            <>
              <Text className="text-slate-400 text-sm">{t("profile.couldNotLoad")}</Text>
              <Pressable onPress={() => void refetchReputation()} hitSlop={8} className="py-1">
                <Text className="text-indigo-400 text-sm font-medium">{t("profile.retry")}</Text>
              </Pressable>
            </>
          ) : reputationFetching && !reputation ? (
            <ActivityIndicator color="#94a3b8" size="small" />
          ) : !showReputationValue ? (
            <Text className="text-slate-500 text-sm">{t("profile.signInReputation")}</Text>
          ) : (
            <Text className="text-slate-100 text-lg font-semibold">{score}</Text>
          )}
        </View>
      </View>
      <Button title={t("profile.leaderboard")} className="mb-4" onPress={() => router.push("/(app)/leaderboard")} />
      <Text className="text-slate-500 text-xs uppercase tracking-wide mb-2">{t("profile.recipes")}</Text>
      <Button
        title={t("profile.commerceRecipe")}
        variant="ghost"
        className="mb-2"
        onPress={() => router.push("/(examples)/commerce")}
      />
      <Button
        title={t("profile.feedRecipe")}
        variant="ghost"
        className="mb-2"
        onPress={() => router.push("/(examples)/feed-only")}
      />
      <View className="mt-8">
        <Button title={t("profile.signOut")} variant="ghost" onPress={() => void clearSession()} />
      </View>
    </View>
  );
}
