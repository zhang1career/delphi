import { useRouter } from "expo-router";

export const options = { title: "Create account" };
import { useState } from "react";
import { Alert, Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { VerificationCodeBottomSheet } from "@/components/ui/VerificationCodeBottomSheet";
import { PendingVerificationError, registerAccount, verifyRegisterCode } from "@/lib/api/register";
import { applySession } from "@/lib/auth/sessionLifecycle";
import { useToast } from "@/lib/notifications/toast";

const NOTICE_CHANNEL_EMAIL = "email";

/** Wait for the modal to dismiss before navigating — avoids native crashes when routing while Modal is visible. */
const NAV_DELAY_MS = 280;

export default function SignUpScreen() {
  const router = useRouter();
  const toast = useToast();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [phone, setPhone] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [verifyOpen, setVerifyOpen] = useState(false);
  /** Set when register returns `event_id` (success or pending); kept after closing the sheet so user can reopen. */
  const [pendingEventId, setPendingEventId] = useState<number | null>(null);
  /** `access_token` from register / pending envelope; required for verify request Bearer. */
  const [verifyAccessToken, setVerifyAccessToken] = useState<string | null>(null);

  const openVerifySheet = () => {
    if (pendingEventId == null) return;
    setVerifyOpen(true);
  };

  return (
    <View className="flex-1 px-6 pt-4">
      <Text className="text-2xl font-bold text-slate-100 mb-6">Create account</Text>
      <TextField label="Username" autoCapitalize="none" value={username} onChangeText={setUsername} />
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField label="Password" secureTextEntry value={password} onChangeText={setPassword} />
      <TextField label="Phone" keyboardType="phone-pad" value={phone} onChangeText={setPhone} />
      <Button
        title={submitting ? "Signing up…" : "Sign up"}
        disabled={submitting}
        className="mt-2"
        onPress={async () => {
          if (submitting) return;
          const emailTrim = email.trim();
          if (!username.trim() || !emailTrim || !password || !phone.trim()) {
            toast.show("Fill username, email, password, and phone.");
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
              const title = "Verification pending";
              if (e.eventId != null) {
                setPendingEventId(e.eventId);
                setVerifyAccessToken(e.accessToken ?? null);
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
              toast.show(e instanceof Error ? e.message : "Sign up failed", { variant: "error" });
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
        title="Verify your account"
        description="Enter the 6-digit verification code we sent you."
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
                toast.show("Welcome!");
                router.replace("/(app)/(tabs)");
              } else {
                toast.show("Account created. Please sign in.");
                router.replace("/(auth)/login");
              }
            })();
          }, NAV_DELAY_MS);
        }}
      />
    </View>
  );
}
