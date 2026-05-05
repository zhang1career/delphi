import { useRouter } from "expo-router";
import { useState } from "react";

export const options = { title: "Forgot password" };
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { VerificationCodeBottomSheet } from "@/components/ui/VerificationCodeBottomSheet";
import { PendingVerificationError } from "@/lib/api/pendingVerificationError";
import { requestPasswordReset, verifyResetPassword } from "@/lib/api/resetPassword";
import { useToast } from "@/lib/notifications/toast";

const NOTICE_CHANNEL_EMAIL = "email";

const NAV_DELAY_MS = 280;

export default function ForgotPasswordScreen() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);

  const openVerifySheet = () => {
    if (pendingEventId == null) return;
    setVerifyOpen(true);
  };

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-2xl font-bold text-slate-100 mb-2">Reset password</Text>
      <Text className="text-slate-400 mb-6">We will send a verification code to your email.</Text>
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <Button
        title={submitting ? "Sending…" : "Send reset link"}
        disabled={submitting}
        className="mt-2"
        onPress={async () => {
          const target = email.trim();
          if (!target) {
            toast.show("Enter your email.");
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
              const title = "Verification pending";
              if (e.eventId != null) {
                setPendingEventId(e.eventId);
                Alert.alert(title, e.message, [
                  { text: "Later", style: "cancel" },
                  { text: "Enter code", onPress: () => setVerifyOpen(true) },
                ]);
              } else {
                Alert.alert(
                  title,
                  `${e.message}\n\nIf you already received a code, try again later or follow the instructions in your email.`,
                  [{ text: "OK" }],
                );
              }
            } else {
              toast.show(e instanceof Error ? e.message : "Request failed", { variant: "error" });
            }
          } finally {
            setSubmitting(false);
          }
        }}
      />
      {pendingEventId != null ? (
        <Button title="Enter verification code" variant="ghost" className="mt-2" onPress={openVerifySheet} />
      ) : null}
      <VerificationCodeBottomSheet
        visible={verifyOpen}
        onClose={() => setVerifyOpen(false)}
        title="Reset password"
        description="Enter the code from your email and choose a new password."
        submitLabel="Update password"
        requireNewPassword
        newPasswordLabel="New password"
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
            toast.show("Password updated. You can sign in now.");
            router.replace("/(auth)/login");
          }, NAV_DELAY_MS);
        }}
      />
    </View>
  );
}
