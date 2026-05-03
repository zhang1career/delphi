import { useRef, useState } from "react";
import {
  Dimensions,
  Image,
  NativeScrollEvent,
  NativeSyntheticEvent,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const BANNER_H = 160;
const PAGE = Math.min(width - 32, 400);

export type BannerSlide = { id: string; title: string; imageUrl: string };

export function BannerCarousel({
  slides,
  onSlidePress,
}: {
  slides: BannerSlide[];
  /** When set, each slide opens as a Pressable target (e.g. navigate to sport event). */
  onSlidePress?: (slide: BannerSlide) => void;
}) {
  const [index, setIndex] = useState(0);
  const scrollRef = useRef<ScrollView>(null);

  if (slides.length === 0) {
    return null;
  }

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const x = e.nativeEvent.contentOffset.x;
    const i = Math.round(x / (PAGE + 12));
    if (i !== index && i >= 0 && i < slides.length) setIndex(i);
  };

  return (
    <View className="mb-4">
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled={false}
        showsHorizontalScrollIndicator={false}
        decelerationRate="fast"
        snapToInterval={PAGE + 12}
        contentContainerStyle={{ paddingHorizontal: 4, gap: 12 }}
        onScroll={onScroll}
        scrollEventThrottle={16}
      >
        {slides.map((s) => (
          <View key={s.id} style={{ width: PAGE }}>
            {onSlidePress ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => onSlidePress(s)}
                className="rounded-2xl overflow-hidden border border-surface-border bg-surface-card active:opacity-90"
              >
                <Image
                  source={{ uri: s.imageUrl }}
                  style={{ width: "100%", height: BANNER_H }}
                  resizeMode="cover"
                />
                <Text className="text-slate-200 px-3 py-2 text-sm font-medium">{s.title}</Text>
              </Pressable>
            ) : (
              <View className="rounded-2xl overflow-hidden border border-surface-border bg-surface-card">
                <Image
                  source={{ uri: s.imageUrl }}
                  style={{ width: "100%", height: BANNER_H }}
                  resizeMode="cover"
                />
                <Text className="text-slate-200 px-3 py-2 text-sm font-medium">{s.title}</Text>
              </View>
            )}
          </View>
        ))}
      </ScrollView>
      <View className="flex-row justify-center gap-1.5 mt-2">
        {slides.map((s, i) => (
          <View
            key={s.id}
            className={`h-1.5 rounded-full ${i === index ? "w-4 bg-brand" : "w-1.5 bg-slate-600"}`}
          />
        ))}
      </View>
    </View>
  );
}
