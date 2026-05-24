import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { VerificationCodeBottomSheet } from "@/components/ui/VerificationCodeBottomSheet";
import { PendingVerificationError, registerAccount, verifyRegisterCode } from "@/lib/api/register";
import { applySession } from "@/lib/auth/sessionLifecycle";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToast } from "@/lib/notifications/toast";

const NOTICE_CHANNEL_EMAIL = "email";

/** Wait for the modal to dismiss before navigating — avoids native crashes when routing while Modal is visible. */
const NAV_DELAY_MS = 280;

export default function SignUpScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLocale();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  const [verifyAccessToken, setVerifyAccessToken] = useState<string | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("auth.signUpNavTitle") });
  }, [navigation, t]);

  const openVerifySheet = () => {
    if (pendingEventId == null) return;
    setVerifyOpen(true);
  };

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-2xl font-bold text-slate-100 mb-6">{t("auth.signUpHeading")}</Text>
      <TextField label={t("auth.username")} autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextField
        label={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label={t("auth.password")} secureTextEntry value={password} onChangeText={setPassword} />
      <TextField label={t("auth.phone")} keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Button
        title={submitting ? t("auth.signingUp") : t("auth.signUp")}
        disabled={submitting}
        className="mt-2"
        onPress={async () => {
          if (submitting) return;
          const emailTrim = email.trim();
          if (!username.trim() || !emailTrim || !password || !phone.trim()) {
            toast.show(t("auth.fillRegisterFields"));
            return;
          }
          setSubmitting(true);
          try {
            setVerifyAccessToken(null);
            const { eventId, session } = await registerAccount({
              username: username.trim(),
              password,
              email: emailTrim,
              phone: phone.trim(),
              noticeChannel: NOTICE_CHANNEL_EMAIL,
              noticeTarget: emailTrim,
            });
            setPendingEventId(eventId);
            setVerifyAccessToken(session?.accessToken ?? null);
            setVerifyOpen(true);
          } catch (e) {
            if (e instanceof PendingVerificationError) {
              const title = t("auth.verificationPending");
              if (e.eventId != null) {
                setPendingEventId(e.eventId);
                setVerifyAccessToken(e.accessToken ?? null);
                Alert.alert(title, e.message, [
                  { text: t("auth.later"), style: "cancel" },
                  { text: t("auth.enterCodeShort"), onPress: () => setVerifyOpen(true) },
                ]);
              } else {
                Alert.alert(title, `${e.message}\n\n${t("auth.verifyFollowEmailHint")}`, [{ text: t("auth.ok") }]);
              }
            } else {
              toast.show(e instanceof Error ? e.message : t("auth.signUpFailedShort"), { variant: "error" });
            }
          } finally {
            setSubmitting(false);
          }
        }}
      />
      {pendingEventId != null ? (
        <Button title={t("auth.enterVerificationCode")} variant="ghost" className="mt-2" onPress={openVerifySheet} />
      ) : null}
      <VerificationCodeBottomSheet
        visible={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title={t("auth.verifyYourAccount")}
        description={t("auth.verifySixDigitDesc")}
        onSubmit={async ({ code }) => {
          if (pendingEventId == null) {
            throw new Error("Registration session expired. Please sign up again.");
          }
          const token = verifyAccessToken?.trim();
          if (!token) {
            throw new Error("Missing access token. Please sign up again to continue verification.");
          }
          const session = await verifyRegisterCode(pendingEventId, code, token);
          setPendingEventId(null);
          setVerifyAccessToken(null);
          setVerifyOpen(false);
          setTimeout(() => {
            void (async () => {
              if (session) {
                await applySession(session);
                toast.show(t("auth.welcome"));
                router.replace("/(app)/(tabs)");
              } else {
                toast.show(t("auth.accountCreatedPleaseSignIn"));
                router.replace("/(auth)/login");
              }
            })();
          }, NAV_DELAY_MS);
        }}
      />
    </View>
  );
}
