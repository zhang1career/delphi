import type { AuthUser } from "@/lib/api/authTypes";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

const KEY_ACCESS = "auth.access_token";
const KEY_REFRESH = "auth.refresh_token";
const KEY_USER = "auth.user_json";

/** Web: expo-secure-store has no native impl; localStorage is standard fallback for dev / browser. */
const WEB_LS_PREFIX = "secure_store.";

function webStorageKey(nativeKey: string): string {
  return `${WEB_LS_PREFIX}${nativeKey}`;
}

function webStorage(): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

function parseStoredUser(raw: string | null): AuthUser | null {
  if (raw == null || raw === "") {
    return null;
  }
  try {
    const v = JSON.parse(raw) as unknown;
    if (!v || typeof v !== "object" || Array.isArray(v)) {
      return null;
    }
    return v as AuthUser;
  } catch {
    return null;
  }
}

export type PersistedAuthTokens = {
  accessToken: string;
  refreshToken: string;
/** When the server omits `data.user`, use the last signed-in user until refresh succeeds. */
  user: AuthUser | null;
};

export async function loadPersistedTokens(): Promise<PersistedAuthTokens | null> {
  let refreshToken: string | null = null;
  let accessToken: string | null = null;
  let userRaw: string | null = null;

  if (Platform.OS === "web") {
    const ls = webStorage();
    refreshToken = ls?.getItem(webStorageKey(KEY_REFRESH)) ?? null;
    accessToken = ls?.getItem(webStorageKey(KEY_ACCESS)) ?? null;
    userRaw = ls?.getItem(webStorageKey(KEY_USER)) ?? null;
  } else {
    refreshToken = await SecureStore.getItemAsync(KEY_REFRESH);
    accessToken = await SecureStore.getItemAsync(KEY_ACCESS);
    userRaw = await SecureStore.getItemAsync(KEY_USER);
  }

  if (typeof refreshToken === "string" && typeof accessToken === "string") {
    return { accessToken, refreshToken, user: parseStoredUser(userRaw) };
  }
  if (refreshToken != null || accessToken != null) {
    await clearAuthTokens();
  }
  return null;
}

export async function persistAuthTokens(tokens: {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}): Promise<void> {
  const userJson = JSON.stringify(tokens.user);
  if (Platform.OS === "web") {
    const ls = webStorage();
    if (!ls) {
      throw new Error("Web storage not available");
    }
    ls.setItem(webStorageKey(KEY_ACCESS), tokens.accessToken);
    ls.setItem(webStorageKey(KEY_REFRESH), tokens.refreshToken);
    ls.setItem(webStorageKey(KEY_USER), userJson);
    return;
  }
  await SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken);
  await SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken);
  await SecureStore.setItemAsync(KEY_USER, userJson);
}

export async function clearAuthTokens(): Promise<void> {
  if (Platform.OS === "web") {
    const ls = webStorage();
    try {
      ls?.removeItem(webStorageKey(KEY_ACCESS));
    } catch {
      /* key may be absent */
    }
    try {
      ls?.removeItem(webStorageKey(KEY_REFRESH));
    } catch {
      /* key may be absent */
    }
    try {
      ls?.removeItem(webStorageKey(KEY_USER));
    } catch {
      /* key may be absent */
    }
    return;
  }
  try {
    await SecureStore.deleteItemAsync(KEY_ACCESS);
  } catch {
    /* key may be absent */
  }
  try {
    await SecureStore.deleteItemAsync(KEY_REFRESH);
  } catch {
    /* key may be absent */
  }
  try {
    await SecureStore.deleteItemAsync(KEY_USER);
  } catch {
    /* key may be absent */
  }
}
