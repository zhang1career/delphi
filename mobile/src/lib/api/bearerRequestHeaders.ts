/** `Accept: application/json` plus `Authorization: Bearer <token>`. */
export function jsonBearerHeaders(bearerToken: string, overrides?: Record<string, string>): HeadersInit {
  return {
    Accept: "application/json",
    Authorization: `Bearer ${bearerToken}`,
    ...overrides,
  };
}
