import { useNavigation } from "@react-navigation/native";
import { useRouter } from "expo-router";
import { useLayoutEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { VerificationCodeBottomSheet } from "@/components/ui/VerificationCodeBottomSheet";
import { PendingVerificationError } from "@/lib/api/pendingVerificationError";
import { requestPasswordReset, verifyResetPassword } from "@/lib/api/resetPassword";
import { useLocale } from "@/i18n/LocaleProvider";
import { useToast } from "@/lib/notifications/toast";

const NOTICE_CHANNEL_EMAIL = "email";

const NAV_DELAY_MS = 280;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const navigation = useNavigation();
  const { t } = useLocale();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);

  useLayoutEffect(() => {
    navigation.setOptions({ title: t("auth.forgotNavTitle") });
  }, [navigation, t]);

  const openVerifySheet = () => {
    if (pendingEventId == null) return;
    setVerifyOpen(true);
  };

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-2xl font-bold text-slate-100 mb-2">{t("auth.resetHeading")}</Text>
      <Text className="text-slate-400 mb-6">{t("auth.resetSubtitle")}</Text>
      <TextField
        label={t("auth.email")}
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        title={submitting ? t("auth.sendingReset") : t("auth.sendResetLink")}
        disabled={submitting}
        className="mt-2"
        onPress={async () => {
          const target = email.trim();
          if (!target) {
            toast.show(t("auth.enterEmailShort"));
            return;
          }
          setSubmitting(true);
          try {
            const { eventId } = await requestPasswordReset({
              noticeChannel: NOTICE_CHANNEL_EMAIL,
              noticeTarget: target,
            });
            setPendingEventId(eventId);
            setVerifyOpen(true);
          } catch (e) {
            if (e instanceof PendingVerificationError) {
              const title = t("auth.verificationPending");
              if (e.eventId != null) {
                setPendingEventId(e.eventId);
                Alert.alert(title, e.message, [
                  { text: t("auth.later"), style: "cancel" },
                  { text: t("auth.enterCodeShort"), onPress: () => setVerifyOpen(true) },
                ]);
              } else {
                Alert.alert(title, `${e.message}\n\n${t("auth.verifyFollowEmailHint")}`, [{ text: t("auth.ok") }]);
              }
            } else {
              toast.show(e instanceof Error ? e.message : t("auth.requestFailedShort"), { variant: "error" });
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
        title={t("auth.resetVerifySheetTitle")}
        description={t("auth.resetVerifySheetDesc")}
        submitLabel={t("auth.updatePassword")}
        requireNewPassword
        newPasswordLabel={t("auth.newPasswordLabelShort")}
        onSubmit={async ({ code, newPassword }) => {
          if (pendingEventId == null) {
            throw new Error("Reset session expired. Request a new link.");
          }
          if (!newPassword?.length) {
            throw new Error("Enter a new password.");
          }
          await verifyResetPassword({
            eventId: pendingEventId,
            code,
            newPassword,
          });
          setPendingEventId(null);
          setVerifyOpen(false);
          setTimeout(() => {
            toast.show(t("auth.passwordUpdatedToast"));
            router.replace("/(auth)/login");
          }, NAV_DELAY_MS);
        }}
      />
    </View>
  );
}
