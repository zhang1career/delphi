import {
  optionalEventIdFromData,
  parseUserApiJson,
  requireEventIdFromData,
  sessionFromEnvelope,
} from "@/lib/api/userApiEnvelope";
import type { LoginSession } from "@/lib/api/authTypes";
import {
  PENDING_VERIFICATION_ERROR_CODE,
  PendingVerificationError,
} from "@/lib/api/pendingVerificationError";
import { USER_REGISTER_PATH, USER_REGISTER_VERIFY_PATH } from "@/lib/api/userApiPaths";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

export { PENDING_VERIFICATION_ERROR_CODE, PendingVerificationError } from "@/lib/api/pendingVerificationError";

export type RegisterParams = {
  username: string;
  password: string;
  email: string;
  phone: string;
  noticeChannel: string;
  noticeTarget: string;
};

export type RegisterResult = {
  eventId: number;
  session: LoginSession | null;
};

/** `multipart/form-data` to `POST .../api/user-agg/register`. */
export async function registerAccount(params: RegisterParams): Promise<RegisterResult> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const form = new FormData();
  form.append("username", params.username);
  form.append("password", params.password);
  form.append("email", params.email);
  form.append("phone", params.phone);
  form.append("notice_channel", params.noticeChannel);
  form.append("notice_target", params.noticeTarget);
  const res = await fetchWithHttpDebug(`${base}${USER_REGISTER_PATH}`, {
    method: "POST",
    body: form,
  });
  const text = await res.text();
  const env = parseUserApiJson(text, res);
  if (env.errorCode !== 0) {
    const msg = env.message?.trim() || `Request failed (errorCode ${env.errorCode})`;
    const eventIdOpt = optionalEventIdFromData(env.data);
    const detail = typeof env.detail === "string" ? env.detail : undefined;
    if (env.errorCode === PENDING_VERIFICATION_ERROR_CODE) {
      throw new PendingVerificationError(msg, env.errorCode, { eventId: eventIdOpt, detail });
    }
    throw new Error(msg);
  }
  return {
    eventId: requireEventIdFromData(env.data, "Register response missing event_id"),
    session: sessionFromEnvelope(env),
  };
}

/** `POST .../api/user-agg/register/verify` with JSON body `{ event_id, code }`. */
export async function verifyRegisterCode(eventId: number, code: string): Promise<LoginSession | null> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const res = await fetchWithHttpDebug(`${base}${USER_REGISTER_VERIFY_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ event_id: eventId, code }),
  });
  const text = await res.text();
  const env = parseUserApiJson(text, res);
  if (env.errorCode !== 0) {
    throw new Error(env.message?.trim() || `Request failed (errorCode ${env.errorCode})`);
  }
  return sessionFromEnvelope(env);
}
