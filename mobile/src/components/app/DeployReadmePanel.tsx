import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";
import { fetchDeployReadmeText } from "@/lib/deployReadme";

type Props = {
  /** Total top padding applied to loading/error/scroll (nav inset + chrome). */
  topPaddingPx: number;
};

export function DeployReadmePanel(props: Props) {
  const { topPaddingPx } = props;
  const [body, setBody] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const load = useCallback(async (signal: AbortSignal) => {
    setErrorMessage(null);
    setBody(null);
    const text = await fetchDeployReadmeText(signal);
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

  const retry = useCallback(() => {
    const ac = new AbortController();
    void load(ac.signal).catch((err: unknown) => {
      if (err instanceof DOMException && err.name === "AbortError") {
        return;
      }
      setErrorMessage(err instanceof Error ? err.message : String(err));
      setBody("");
    });
  }, [load]);

  if (body === null && !errorMessage) {
    return (
      <View className="flex-1 bg-surface items-center justify-center" style={{ paddingTop: topPaddingPx }}>
        <ActivityIndicator color="#94a3b8" />
      </View>
    );
  }

  if (errorMessage) {
    return (
      <View className="flex-1 bg-surface px-4" style={{ paddingTop: topPaddingPx }}>
        <Text className="text-slate-100 mb-2">Could not load readme</Text>
        <Text className="text-slate-400 mb-6">{errorMessage}</Text>
        <Pressable onPress={retry} className="self-start py-2" hitSlop={8}>
          <Text className="text-indigo-400 font-medium">Retry</Text>
        </Pressable>
      </View>
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-surface"
      contentContainerStyle={{
        paddingTop: topPaddingPx,
        paddingHorizontal: 16,
        paddingBottom: 32,
      }}
    >
      <Text selectable className="text-slate-300 text-sm font-mono leading-6">
        {body}
      </Text>
    </ScrollView>
  );
}
