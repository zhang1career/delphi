import Ionicons from "@expo/vector-icons/Ionicons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useEffect, useMemo, useRef } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useProductQuery } from "@/features/catalog/hooks";
import { mallProductImageUriList } from "@/lib/mallCdn";
import { useToast } from "@/lib/notifications/toast";
import { useCartStore } from "@/stores/cartStore";

const WINDOW_W = Dimensions.get("window").width;
const BANNER_H = 280;
const EXT_IMAGE_H = 220;
const BANNER_AUTO_MS = 4000;
const FLOAT_BAR_EXTRA = 56;

export default function ProductDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const toast = useToast();
  const add = useCartStore((s) => s.add);
  const { data: product, isPending } = useProductQuery(id ?? "");
  const bannerScrollRef = useRef<ScrollView>(null);
  const bannerIndexRef = useRef(0);

  const mainUris = useMemo(
    () => (product ? mallProductImageUriList(product.mainMediaKeys, product.imageUrl) : []),
    [product],
  );
  const extUris = useMemo(
    () => (product ? mallProductImageUriList(product.extMediaKeys, product.imageUrl) : []),
    [product],
  );

  const onBannerScrollEnd = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    bannerIndexRef.current = Math.round(x / WINDOW_W);
  }, []);

  useEffect(() => {
    if (!product) {
      return;
    }
    bannerIndexRef.current = 0;
    bannerScrollRef.current?.scrollTo({ x: 0, animated: false });
  }, [product?.id]);

  useEffect(() => {
    const n = mainUris.length;
    if (n <= 1) {
      return;
    }
    const timerId = setInterval(() => {
      const next = (bannerIndexRef.current + 1) % n;
      bannerIndexRef.current = next;
      bannerScrollRef.current?.scrollTo({ x: next * WINDOW_W, animated: true });
    }, BANNER_AUTO_MS);
    return () => clearInterval(timerId);
  }, [mainUris.length]);

  if (isPending || !product) {
    return (
      <View className="flex-1 bg-surface items-center justify-center">
        <ActivityIndicator color="#a5b4fc" />
      </View>
    );
  }

  const priceLabel =
    product.priceCents == null ? "Price on request" : `$${(product.priceCents / 100).toFixed(2)}`;
  const stockLabel =
    product.stockQuantity !== undefined ? `In stock: ${product.stockQuantity}` : "Stock: —";

  const scrollBottomPad = insets.bottom + FLOAT_BAR_EXTRA;

  return (
    <View className="flex-1 bg-surface">
      <ScrollView
        className="flex-1"
        contentContainerStyle={{ paddingBottom: scrollBottomPad }}
        showsVerticalScrollIndicator={false}
      >
        {mainUris.length > 0 ? (
          <ScrollView
            ref={bannerScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            decelerationRate="fast"
            onMomentumScrollEnd={onBannerScrollEnd}
          >
            {mainUris.map((uri, i) => (
              <Image
                key={`main-${i}-${uri}`}
                source={{ uri }}
                style={{ width: WINDOW_W, height: BANNER_H }}
                resizeMode="cover"
              />
            ))}
          </ScrollView>
        ) : null}

        <View className="p-4">
          <Text className="text-2xl font-bold text-slate-100">{product.title}</Text>
          <Text className="text-brand-muted text-lg mt-3">{priceLabel}</Text>
          <Text className="text-slate-400 mt-4 leading-6">{product.description}</Text>
          <Text className="text-slate-500 text-sm mt-4">{stockLabel}</Text>
        </View>

        {extUris.length > 0 ? (
          <View>
            {extUris.map((uri, i) => (
              <Image
                key={`ext-${i}-${uri}`}
                source={{ uri }}
                style={{ width: "100%", height: EXT_IMAGE_H }}
                resizeMode="cover"
              />
            ))}
          </View>
        ) : null}
      </ScrollView>

      <View
        className="absolute left-0 right-0 border-t border-surface-border bg-surface px-3"
        style={{ bottom: 0, paddingBottom: insets.bottom }}
      >
        <View className="flex-row items-stretch py-2 gap-2">
          <Pressable
            accessibilityLabel="加入购物车"
            className="flex-1 bg-brand rounded-xl py-3.5 px-4 items-center justify-center active:opacity-90"
            onPress={() => {
              add(product);
              toast.show("已加入购物车");
            }}
          >
            <Text className="text-white font-semibold text-base">加入购物车</Text>
          </Pressable>
          <Pressable
            accessibilityLabel="打开购物车"
            className="w-14 items-center justify-center rounded-xl border border-surface-border bg-surface-card active:opacity-80"
            onPress={() => router.push("/(app)/(tabs)/cart")}
          >
            <Ionicons name="cart-outline" size={26} color="#a5b4fc" />
          </Pressable>
        </View>
      </View>
    </View>
  );
}
