import { Image, Pressable, Text, View } from "react-native";
import type { Product } from "@/lib/api/types";
import { mallProductImageUri } from "@/lib/mallCdn";

type Props = {
  product: Product;
  onPress: () => void;
};

export function ProductCard({ product, onPress }: Props) {
  const priceLabel =
    product.priceCents == null ? "—" : `$${(product.priceCents / 100).toFixed(2)}`;
  const thumbOrMain = product.thumbnail ?? product.mainMediaKeys?.[0];
  const uri = mallProductImageUri(thumbOrMain, product.imageUrl);
  const logCdnErrors = Boolean((typeof thumbOrMain === "string" ? thumbOrMain : "").trim());
  return (
    <Pressable
      onPress={onPress}
      className="flex-1 min-w-[46%] max-w-[50%] bg-surface-card rounded-xl border border-surface-border overflow-hidden mb-3 active:opacity-90"
    >
      <Image
        source={{ uri }}
        style={{ width: "100%", height: 144 }}
        resizeMode="cover"
        onError={(e) => {
          if (logCdnErrors) {
            console.warn("[mall cdn] image error", uri, e.nativeEvent.error);
          }
        }}
      />
      <View className="p-2">
        <Text className="text-slate-100 text-sm font-medium" numberOfLines={2}>
          {product.title}
        </Text>
        <Text className="text-brand-muted text-xs mt-1">{priceLabel}</Text>
      </View>
    </Pressable>
  );
}
