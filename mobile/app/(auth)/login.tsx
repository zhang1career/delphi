import { useNavigation } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { loginWithPassword } from "@/lib/api/login";
import { applySession } from "@/lib/auth/sessionLifecycle";
import { hrefAfterLoginFromParam } from "@/lib/auth/postLoginReturn";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToast } from "@/lib/notifications/toast";

export default function LoginScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLocale();
  const { returnTo } = useLocalSearchParams<{ returnTo?: string }>();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("auth.signInNavTitle") });
  }, [navigation, t]);

  return (
    <View className="flex-1 px-6 pt-4 justify-center">
      <Text className="text-3xl font-bold text-slate-100 mb-1">{t("auth.signInHeading")}</Text>
      <Text className="text-slate-400 mb-8">{t("auth.signInSubtitle")}</Text>
      <TextField
        label={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} />
      <Button
        title={submitting ? t("auth.signingIn") : t("auth.continue")}
        disabled={submitting}
        onPress={async () => {
          if (submitting) return;
          setSubmitting(true);
          try {
            const session = await loginWithPassword(email.trim(), password);
            await applySession(session);
            toast.show(t("auth.signedInToast"));
            router.replace(hrefAfterLoginFromParam(returnTo));
          } catch (e) {
            const message = e instanceof Error ? e.message : t("auth.signInFailed");
            toast.show(message, { variant: "error" });
          } finally {
            setSubmitting(false);
          }
        }}
      />
      <Button title={t("auth.createAccount")} variant="ghost" className="mt-3" onPress={() => router.push("/(auth)/sign-up")} />
      <Button title={t("auth.forgotPassword")} variant="ghost" className="mt-1" onPress={() => router.push("/(auth)/forgot-password")} />
      <View className="mt-10 border-t border-surface-border pt-6">
        <Text className="text-slate-500 text-xs text-center mb-3">{t("auth.recipeHint")}</Text>
        <Button title={t("auth.openCommerceRecipe")} variant="ghost" onPress={() => router.push("/(examples)/commerce")} />
        <Button title={t("auth.openFeedRecipe")} variant="ghost" className="mt-2" onPress={() => router.push("/(examples)/feed-only")} />
      </View>
    </View>
  );
}
