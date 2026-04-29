import { useRouter } from "expo-router";
import { ActivityIndicator, FlatList, Text, View } from "react-native";
import { BannerCarousel } from "@/components/app/BannerCarousel";
import { ProductCard } from "@/components/app/ProductCard";
import { useProductsQuery } from "@/features/catalog/hooks";

/** Minimal commerce shell without tabs — for white-label “store only” apps. */
export default function CommerceRecipeScreen() {
  const router = useRouter();
  const { data, isPending, isError } = useProductsQuery();
  const items = data?.items ?? [];

  return (
    <View className="flex-1 bg-surface pt-4">
      <Text className="text-lg font-semibold text-slate-100 px-4 mb-2">Recipe: commerce</Text>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
        ListHeaderComponent={
          <>
            <BannerCarousel />
            {isError ? (
              <Text className="text-red-400 px-4 mb-2">Could not load products.</Text>
            ) : null}
          </>
        }
        ListEmptyComponent={
          isPending ? (
            <View className="py-8 items-center">
              <ActivityIndicator color="#a5b4fc" />
            </View>
          ) : (
            <Text className="text-slate-500 px-4">No products.</Text>
          )
        }
        renderItem={({ item }) => (
          <ProductCard
            product={item}
            onPress={() => router.push(`/(examples)/commerce/product/${item.id}`)}
          />
        )}
        contentContainerStyle={{ paddingBottom: 32 }}
      />
    </View>
  );
}
