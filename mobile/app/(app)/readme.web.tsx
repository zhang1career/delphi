import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";

/** Nginx alias: plaintext `readme.txt` at `/delphi/readme` (see deploy nginx). */
const README_TXT_FETCH_PATH = "/delphi/readme";

export default function ReadmeScreen() {
  const webNavTop = useWebTopTabBarInset();
  const [body, setBody] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setErrorMessage(null);
    setBody(null);
    const res = await fetch(README_TXT_FETCH_PATH, {
      signal,
      headers: { Accept: "text/plain" },
      cache: "default",
    });
    if (!res.ok) {
      setErrorMessage(`HTTP ${String(res.status)}`);
      setBody("");
      return;
    }
    const text = await res.text();
    setBody(text);
  }, []);

  useEffect(() => {
    const ac = new AbortController();
    void load(ac.signal).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setBody("");
    });
    return () => ac.abort();
  }, [load]);

  const topPad = webNavTop + 12;

  if (body === null && !errorMessage) {
    return (
      <View className="flex-1 bg-surface items-center justify-center" style={{ paddingTop: topPad }}>
        <ActivityIndicator color="#94a3b8" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 bg-surface px-4" style={{ paddingTop: topPad }}>
        <Text className="text-slate-100 mb-2">Could not load readme</Text>
        <Text className="text-slate-400 mb-6">{errorMessage}</Text>
        <Pressable
          onPress={() => {
            const ac = new AbortController();
            void load(ac.signal).catch((err: unknown) => {
              if (err instanceof DOMException && err.name === "AbortError") {
                return;
              }
              setErrorMessage(err instanceof Error ? err.message : String(err));
              setBody("");
            });
          }}
          className="self-start py-2"
          hitSlop={8}
        >
          <Text className="text-indigo-400 font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{
        paddingTop: topPad,
        paddingHorizontal: 16,
        paddingBottom: 32,
      }}
    >
      <Text className="text-slate-300 text-sm font-mono leading-6">{body}</Text>
    </ScrollView>
  );
}
