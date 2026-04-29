import { Text, View } from "react-native";
import type { FeedItem } from "@/lib/api/types";

export function FeedRow({ item }: { item: FeedItem }) {
  return (
    <View className="bg-surface-card border border-surface-border rounded-xl p-4 mb-3">
      <Text className="text-brand-muted text-xs mb-1">{item.author}</Text>
      <Text className="text-slate-100 text-base leading-6">{item.body}</Text>
      <Text className="text-slate-500 text-xs mt-2">{item.createdAt.slice(0, 10)}</Text>
    </View>
  );
}
