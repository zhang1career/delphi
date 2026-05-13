import * as React from "react";
import { Platform } from "react-native";
import {
  LOCALE_STORAGE_KEY,
  detectInitialLocale,
  type AppLocale,
} from "@/i18n/localeDetect";
import { MESSAGE_CATALOGS } from "@/i18n/messages";

type LocaleContextValue = {
  locale: AppLocale;
  setLocale: (next: AppLocale) => void;
  t: (key: string) => string;
};

const LocaleContext = React.createContext<LocaleContextValue | null>(null);

export function LocaleProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [locale, setLocaleState] = React.useState<AppLocale>(() => detectInitialLocale());

  const setLocale = React.useCallback((next: AppLocale) => {
    setLocaleState(next);
    if (Platform.OS === "web" && typeof window !== "undefined") {
      window.localStorage.setItem(LOCALE_STORAGE_KEY, next);
    }
  }, []);

  const t = React.useCallback(
    (key: string) => MESSAGE_CATALOGS[locale][key] ?? MESSAGE_CATALOGS.en[key] ?? key,
    [locale],
  );

  const value = React.useMemo(() => ({ locale, setLocale, t }), [locale, setLocale, t]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = React.useContext(LocaleContext);
  if (ctx == null) {
    throw new Error("useLocale must be used within LocaleProvider");
  }
  return ctx;
}
