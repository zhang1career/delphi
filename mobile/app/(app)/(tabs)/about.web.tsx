import { Text, View } from "react-native";
import { DeployReadmePanel } from "@/components/app/DeployReadmePanel";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";

export default function AboutTabScreen() {
  const webNavTop = useWebTopTabBarInset();

  return (
    <View className="flex-1 bg-surface">
      <View
        className="px-4 border-b border-[#334155] bg-surface"
        style={{
          paddingTop: webNavTop + 16,
          paddingBottom: 14,
        }}
      >
        <Text className="text-xl font-bold text-slate-100">About</Text>
        <Text className="text-slate-500 text-sm mt-1 leading-5">
          Deployment notes, API entry points, and agent instructions (same text as the static{" "}
          <Text className="text-slate-400 font-mono text-xs">readme.txt</Text> served at this app&apos;s
          base path).
        </Text>
      </View>
      <DeployReadmePanel topPaddingPx={12} />
    </View>
  );
}
