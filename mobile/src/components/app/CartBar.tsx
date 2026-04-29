import { Pressable, Text, View } from "react-native";
import { cartTotalCents, useCartStore } from "@/stores/cartStore";

type Props = {
  onCheckout: () => void;
};

export function CartBar({ onCheckout }: Props) {
  const lines = useCartStore((s) => s.lines);
  if (lines.length === 0) return null;
  const total = (cartTotalCents(lines) / 100).toFixed(2);
  const count = lines.reduce((n, l) => n + l.qty, 0);
  return (
    <View className="absolute bottom-0 left-0 right-0 bg-surface-card border-t border-surface-border px-4 py-3 flex-row items-center justify-between">
      <Text className="text-slate-200">
        {count} item{count !== 1 ? "s" : ""} · ${total}
      </Text>
      <Pressable
        onPress={onCheckout}
        className="bg-brand px-4 py-2 rounded-lg active:opacity-90"
      >
        <Text className="text-white font-semibold text-sm">Cart</Text>
      </Pressable>
    </View>
  );
}
