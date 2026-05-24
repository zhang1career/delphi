import * as React from "react";
import { Platform, Pressable, Text, View } from "react-native";
import { useLocale } from "@/i18n/LocaleProvider";

/** Web-only control in the top nav (native follows OS locale; no in-app toggle per product rules). */
export function WebLocaleSwitcher(): React.ReactElement | null {
  if (Platform.OS !== "web") {
    return null;
  }

  const { locale, setLocale } = useLocale();

  const pill = (code: "en" | "zh", label: string): React.ReactElement => {
    const active = locale === code;
    return (
      <Pressable
        onPress={() => setLocale(code)}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        accessibilityLabel={label}
        style={{
          paddingHorizontal: 10,
          paddingVertical: 8,
          backgroundColor: active ? "#1e293b" : "transparent",
        }}
      >
        <Text style={{ fontSize: 12, fontWeight: "700", color: active ? "#a5b4fc" : "#64748b" }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      style={{
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#334155",
        borderRadius: 10,
        overflow: "hidden",
        marginLeft: 10,
        flexShrink: 0,
      }}
    >
      {pill("en", "English")}
      <View style={{ width: 1, alignSelf: "stretch", backgroundColor: "#334155" }} />
      {pill("zh", "中文")}
    </View>
  );
}
