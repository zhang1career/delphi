import { useEffect, useRef, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";

const DEFAULT_LENGTH = 6;

export type VerificationSheetSubmitPayload = {
  code: string;
  newPassword?: string;
};

export type VerificationCodeBottomSheetProps = {
  visible: boolean;
  onClose: () => void;
  onSubmit: (payload: VerificationSheetSubmitPayload) => void | Promise<void>;
  title?: string;
  description?: string;
  submitLabel?: string;
  /** Defaults to 6. */
  codeLength?: number;
  /** When set, shows a secure field and passes `newPassword` in the submit payload. */
  requireNewPassword?: boolean;
  newPasswordLabel?: string;
};

export function VerificationCodeBottomSheet({
  visible,
  onClose,
  onSubmit,
  title = "Enter verification code",
  description = "Enter the 6-digit code we sent to you.",
  submitLabel = "Confirm",
  codeLength = DEFAULT_LENGTH,
  requireNewPassword = false,
  newPasswordLabel = "New password",
}: VerificationCodeBottomSheetProps) {
  const insets = useSafeAreaInsets();
  const mountedRef = useRef(true);
  const inputRef = useRef<TextInput>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (visible) {
      setCode("");
      setNewPassword("");
      setError(null);
      setSubmitting(false);
      const t = setTimeout(() => inputRef.current?.focus(), 280);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const passwordOk = !requireNewPassword || newPassword.trim().length > 0;
  const canSubmit = code.length === codeLength && passwordOk && !submitting;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);
    try {
      await onSubmit(
        requireNewPassword
          ? { code, newPassword: newPassword.trim() }
          : { code },
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      if (mountedRef.current) {
        setSubmitting(false);
      }
    }
  };

  const slots = Array.from({ length: codeLength }, (_, i) => i);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View className="flex-1 justify-end bg-black/60">
        <Pressable className="flex-1 w-full" onPress={onClose} accessibilityRole="button" accessibilityLabel="Close" />
        <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
          <View
            className="bg-surface-card rounded-t-2xl border-t border-x border-surface-border px-5 pt-3"
            style={{ paddingBottom: Math.max(insets.bottom, 16) + 16 }}
          >
            <View className="w-10 h-1 bg-slate-600 rounded-full self-center mb-4" />
            <Text className="text-slate-100 text-xl font-semibold">{title}</Text>
            <Text className="text-slate-400 text-sm mt-2 mb-4">{description}</Text>
            <Text className="text-slate-400 text-xs mb-2">Code</Text>
            <Pressable
              onPress={() => inputRef.current?.focus()}
              accessibilityRole="none"
              className="relative min-h-[56px]"
            >
              <View className="flex-row gap-2">
                {slots.map((i) => {
                  const filled = code[i];
                  const isActive = i === code.length && code.length < codeLength;
                  return (
                    <View
                      key={i}
                      className={`flex-1 h-14 rounded-xl border items-center justify-center bg-surface ${
                        isActive ? "border-brand" : "border-surface-border"
                      }`}
                    >
                      {filled ? (
                        <Text className="text-slate-100 text-2xl font-semibold">{filled}</Text>
                      ) : (
                        <Text className="text-slate-600 text-xl">—</Text>
                      )}
                    </View>
                  );
                })}
              </View>
              <TextInput
                ref={inputRef}
                className="absolute left-0 right-0 top-0 bottom-0 opacity-0"
                value={code}
                onChangeText={(t) => setCode(t.replace(/\s/g, "").slice(0, codeLength))}
                maxLength={codeLength}
                autoCapitalize="none"
                autoCorrect={false}
                editable={!submitting}
                caretHidden
                accessibilityLabel="Verification code"
              />
            </Pressable>
            {requireNewPassword ? (
              <TextField
                label={newPasswordLabel}
                secureTextEntry
                value={newPassword}
                onChangeText={setNewPassword}
                editable={!submitting}
                className="mt-4"
              />
            ) : null}
            {error ? <Text className="text-red-400 text-sm mt-2">{error}</Text> : null}
            <Button
              title={submitting ? "Submitting…" : submitLabel}
              className="mt-5"
              disabled={!canSubmit}
              onPress={handleSubmit}
            />
            <Button title="Cancel" variant="ghost" className="mt-2" onPress={onClose} disabled={submitting} />
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}
