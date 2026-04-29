import {
  optionalEventIdFromData,
  parseUserApiJson,
  requireEventIdFromData,
} from "@/lib/api/userApiEnvelope";
import {
  PENDING_VERIFICATION_ERROR_CODE,
  PendingVerificationError,
} from "@/lib/api/pendingVerificationError";
import { USER_RESET_PASSWORD_PATH, USER_RESET_PASSWORD_VERIFY_PATH } from "@/lib/api/userApiPaths";
import { fetchWithHttpDebug } from "@/lib/httpDebug";
import { getServiceOrigins } from "@/lib/serviceOrigins";

export type RequestPasswordResetParams = {
  noticeChannel: string;
  noticeTarget: string;
};

export type RequestPasswordResetResult = {
  eventId: number;
};

/** `POST .../api/user-agg/reset-password` with JSON `{ notice_channel, notice_target }`. */
export async function requestPasswordReset(
  params: RequestPasswordResetParams,
): Promise<RequestPasswordResetResult> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const res = await fetchWithHttpDebug(`${base}${USER_RESET_PASSWORD_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      notice_channel: params.noticeChannel,
      notice_target: params.noticeTarget,
    }),
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
    eventId: requireEventIdFromData(env.data, "Reset response missing event_id"),
  };
}

export type VerifyResetPasswordParams = {
  eventId: number;
  code: string;
  newPassword: string;
};

/** `POST .../api/user-agg/reset-password/verify` with JSON `{ event_id, code, new_password }`. */
export async function verifyResetPassword(params: VerifyResetPasswordParams): Promise<void> {
  const { userAggBaseUrl: base } = await getServiceOrigins();
  const res = await fetchWithHttpDebug(`${base}${USER_RESET_PASSWORD_VERIFY_PATH}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      event_id: params.eventId,
      code: params.code,
      new_password: params.newPassword,
    }),
  });
  const text = await res.text();
  const env = parseUserApiJson(text, res);
  if (env.errorCode !== 0) {
    throw new Error(env.message?.trim() || `Request failed (errorCode ${env.errorCode})`);
  }
}
