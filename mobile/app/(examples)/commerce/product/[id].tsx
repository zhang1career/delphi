import { useLocalSearchParams } from "expo-router";
import { ActivityIndicator, Image, ScrollView, Text, View } from "react-native";
import { useProductQuery } from "@/features/catalog/hooks";
import { mallProductImageUri } from "@/lib/mallCdn";

export default function ExampleProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: product, isPending } = useProductQuery(id ?? "");

  if (!id || isPending || !product) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#a5b4fc" />
      </View>
    );
  }

  const price =
    product.priceCents == null ? "—" : `$${(product.priceCents / 100).toFixed(2)}`;
  const heroUri = mallProductImageUri(product.thumbnail, product.imageUrl);

  return (
    <ScrollView className="flex-1 bg-surface">
      <Image source={{ uri: heroUri }} style={{ width: "100%", height: 240 }} resizeMode="cover" />
      <View className="p-4">
        <Text className="text-xl font-bold text-slate-100">{product.title}</Text>
        <Text className="text-brand-muted mt-2">{price}</Text>
        <Text className="text-slate-400 mt-4 leading-6">{product.description}</Text>
      </View>
    </ScrollView>
  );
}
