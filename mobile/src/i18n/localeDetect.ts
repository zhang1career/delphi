import * as Localization from "expo-localization";
import { Platform } from "react-native";

export type AppLocale = "en" | "zh";

export const LOCALE_STORAGE_KEY = "delphi_app_locale";

function localeFromLanguageTag(tag: string | undefined): AppLocale {
  const s = (tag ?? "en").toLowerCase();
  return s.startsWith("zh") ? "zh" : "en";
}

/** Web: prefers `localStorage`, then browser language. Native: OS locale via expo-localization. */
export function detectInitialLocale(): AppLocale {
  if (Platform.OS === "web" && typeof window !== "undefined") {
    const stored = window.localStorage?.getItem(LOCALE_STORAGE_KEY);
    if (stored === "en" || stored === "zh") {
      return stored;
    }
    return localeFromLanguageTag(navigator.language);
  }

  const locales = Localization.getLocales?.() ?? [];
  const primary =
    locales.length > 0
      ? locales[0]?.languageTag ?? locales[0]?.languageCode ?? Localization.locale
      : Localization.locale;
  return localeFromLanguageTag(primary);
}
