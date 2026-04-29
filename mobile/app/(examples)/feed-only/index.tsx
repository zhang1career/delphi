import { ActivityIndicator, FlatList, RefreshControl, Text, View } from "react-native";

export const options = { title: "Feed-only recipe" };
import { FeedRow } from "@/components/app/FeedRow";
import { useFeedQuery } from "@/features/feed/hooks";

/** Feed + pull-to-refresh only — no commerce tabs. */
export default function FeedOnlyRecipeScreen() {
  const { data, isPending, isError, refetch, isRefetching } = useFeedQuery();

  return (
    <View className="flex-1 bg-surface px-4 pt-4">
      <Text className="text-lg font-semibold text-slate-100 mb-4">Recipe: feed-only</Text>
      <FlatList
        data={data ?? []}
        keyExtractor={(item) => item.id}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={() => refetch()} tintColor="#a5b4fc" />
        }
        ListEmptyComponent={
          isPending ? (
            <ActivityIndicator color="#a5b4fc" />
          ) : isError ? (
            <Text className="text-red-400">Failed to load.</Text>
          ) : (
            <Text className="text-slate-500">Empty feed.</Text>
          )
        }
        renderItem={({ item }) => <FeedRow item={item} />}
      />
    </View>
  );
}
