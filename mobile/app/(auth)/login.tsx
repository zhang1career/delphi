import { useRouter } from "expo-router";

export const options = { title: "Sign in" };
import { useState } from "react";
import { Text, View } from "react-native";
import { Button } from "@/components/ui/Button";
import { TextField } from "@/components/ui/TextField";
import { loginWithPassword } from "@/lib/api/login";
import { applySession } from "@/lib/auth/sessionLifecycle";
import { useToast } from "@/lib/notifications/toast";

export default function LoginScreen() {
  const router = useRouter();
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  return (
    <View className="flex-1 px-6 pt-4 justify-center">
      <Text className="text-3xl font-bold text-slate-100 mb-1">Sign in</Text>
      <Text className="text-slate-400 mb-8">Sign in with your account.</Text>
      <TextField
        label="Email"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextField
        label="Password"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <Button
        title={submitting ? "Signing in…" : "Continue"}
        disabled={submitting}
        onPress={async () => {
          if (submitting) return;
          setSubmitting(true);
          try {
            const session = await loginWithPassword(email.trim(), password);
            await applySession(session);
            toast.show("Signed in");
            router.replace("/(app)/(tabs)");
          } catch (e) {
            const message = e instanceof Error ? e.message : "Sign in failed";
            toast.show(message, { variant: "error" });
          } finally {
            setSubmitting(false);
          }
        }}
      />
      <Button
        title="Create account"
        variant="ghost"
        className="mt-3"
        onPress={() => router.push("/(auth)/sign-up")}
      />
      <Button
        title="Forgot password?"
        variant="ghost"
        className="mt-1"
        onPress={() => router.push("/(auth)/forgot-password")}
      />
      <View className="mt-10 border-t border-surface-border pt-6">
        <Text className="text-slate-500 text-xs text-center mb-3">
          Recipe layouts: app/(examples)/ — also linked from Profile when signed in.
        </Text>
        <Button
          title="Open commerce recipe"
          variant="ghost"
          onPress={() => router.push("/(examples)/commerce")}
        />
        <Button
          title="Open feed-only recipe"
          variant="ghost"
          className="mt-2"
          onPress={() => router.push("/(examples)/feed-only")}
        />
      </View>
    </View>
  );
}
