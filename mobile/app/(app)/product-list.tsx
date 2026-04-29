import Ionicons from "@expo/vector-icons/Ionicons";
import { useRouter } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { CartBar } from "@/components/app/CartBar";
import { ProductCard } from "@/components/app/ProductCard";
import { useProductsByIdsQuery } from "@/features/catalog/hooks";
import {
  PRODUCT_LIST_DEFAULT_HEADER,
  useProductListStore,
} from "@/stores/productListStore";

export default function ProductListScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const productIds = useProductListStore((s) => s.productIds);
  const headerTitle = useProductListStore((s) => s.headerTitle);
  const { products, deduped, isPending, isError } = useProductsByIdsQuery(productIds);

  const onBack = () => {
    if (router.canGoBack()) {
      router.back();
      return;
    }
    router.replace("/(app)/(tabs)");
  };

  return (
    <View className="flex-1 bg-surface" style={{ paddingTop: insets.top + 8 }}>
      <View className="flex-row items-center px-2 mb-2 min-h-[44px]">
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="返回"
          hitSlop={12}
          className="p-2 active:opacity-70"
          onPress={onBack}
        >
          <Ionicons name="chevron-back" size={28} color="#e2e8f0" />
        </Pressable>
        <Text
          className="flex-1 text-lg font-semibold text-slate-100 pr-10 text-center"
          numberOfLines={1}
        >
          {headerTitle}
        </Text>
      </View>

      {deduped.length === 0 ? (
        <View className="flex-1 items-center justify-center px-6">
          <Text className="text-slate-400 text-center">
            {headerTitle !== PRODUCT_LIST_DEFAULT_HEADER
              ? "没有找到相关商品。"
              : "暂无商品列表，请从搜索或活动入口进入。"}
          </Text>
        </View>
      ) : isPending ? (
        <View className="flex-1 items-center justify-center">
          <ActivityIndicator color="#a5b4fc" />
        </View>
      ) : (
        <FlatList
          data={products}
          keyExtractor={(item) => item.id}
          numColumns={2}
          columnWrapperStyle={{ justifyContent: "space-between", paddingHorizontal: 16 }}
          ListEmptyComponent={
            isError ? (
              <Text className="text-red-400 px-4">无法加载部分或全部商品。</Text>
            ) : (
              <Text className="text-slate-500 px-4">没有可展示的商品。</Text>
            )
          }
          renderItem={({ item }) => (
            <ProductCard
              product={item}
              onPress={() => router.push(`/(app)/product/${item.id}`)}
            />
          )}
          contentContainerStyle={{ paddingBottom: 120, flexGrow: 1 }}
        />
      )}
      <CartBar onCheckout={() => router.push("/(app)/(tabs)/cart")} />
    </View>
  );
}
