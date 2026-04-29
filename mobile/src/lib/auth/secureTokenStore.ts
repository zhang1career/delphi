import * as SecureStore from "expo-secure-store";

const KEY_ACCESS = "auth.access_token";
const KEY_REFRESH = "auth.refresh_token";

export type PersistedAuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export async function loadPersistedTokens(): Promise<PersistedAuthTokens | null> {
  const refreshToken = await SecureStore.getItemAsync(KEY_REFRESH);
  const accessToken = await SecureStore.getItemAsync(KEY_ACCESS);
  if (typeof refreshToken === "string" && typeof accessToken === "string") {
    return { accessToken, refreshToken };
  }
  if (refreshToken != null || accessToken != null) {
    await clearAuthTokens();
  }
  return null;
}

export async function persistAuthTokens(tokens: PersistedAuthTokens): Promise<void> {
  await SecureStore.setItemAsync(KEY_ACCESS, tokens.accessToken);
  await SecureStore.setItemAsync(KEY_REFRESH, tokens.refreshToken);
}

export async function clearAuthTokens(): Promise<void> {
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
}
