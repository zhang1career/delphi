import { Text, View } from "react-native";
import { DeployReadmePanel } from "@/components/app/DeployReadmePanel";
import { useLocale } from "@/i18n/LocaleProvider";
import { useWebTopTabBarInset } from "@/lib/navigation/useWebTopTabBarInset";

export function AboutDocumentationScreen() {
  const webNavTop = useWebTopTabBarInset();
  const { t } = useLocale();

  return (
    <View className="flex-1 bg-surface">
      <View
        className="px-4 border-b border-[#334155] bg-surface"
        style={{
          paddingTop: webNavTop + 16,
          paddingBottom: 14,
        }}
      >
        <Text className="text-xl font-bold text-slate-100">{t("about.title")}</Text>
        <Text className="text-slate-500 text-sm mt-1 leading-5">{t("about.subtitle")}</Text>
      </View>
      <DeployReadmePanel topPaddingPx={12} />
    </View>
  );
}
