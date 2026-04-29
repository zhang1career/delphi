import { ResizeMode, Video, type AVPlaybackStatus } from "expo-av";
import { useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";

type Props = {
  uri: string;
  style?: object;
};

/**
 * Thin wrapper over expo-av so screens do not import AV directly.
 */
export function VideoPlayer({ uri, style }: Props) {
  const ref = useRef<Video>(null);
  const [status, setStatus] = useState<AVPlaybackStatus | null>(null);

  const playing = status && status.isLoaded && status.isPlaying;

  return (
    <View className="rounded-xl overflow-hidden border border-surface-border bg-black">
      <Video
        ref={ref}
        style={[{ width: "100%", aspectRatio: 16 / 9 }, style]}
        source={{ uri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        onPlaybackStatusUpdate={setStatus}
      />
      <Pressable
        className="py-2 bg-surface-card"
        onPress={() => {
          if (!ref.current) return;
          if (playing) void ref.current.pauseAsync();
          else void ref.current.playAsync();
        }}
      >
        <Text className="text-center text-slate-300 text-sm">
          {playing ? "Pause" : "Play"} (native controls also work)
        </Text>
      </Pressable>
    </View>
  );
}
