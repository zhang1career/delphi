/** HTTP 200 + `errorCode` 304: same notice target already has a pending verify flow (register, reset password, etc.). */
export const PENDING_VERIFICATION_ERROR_CODE = 304;

export class PendingVerificationError extends Error {
  readonly errorCode: number;
  readonly eventId?: number;
  readonly detail?: string;
  /** Present when the gateway returned `data.access_token` for the pending verify step. */
  readonly accessToken?: string;

  constructor(
    message: string,
    errorCode: number,
    options?: { eventId?: number; detail?: string; accessToken?: string },
  ) {
    super(message);
    this.name = "PendingVerificationError";
    this.errorCode = errorCode;
    this.eventId = options?.eventId;
    this.detail = options?.detail;
    this.accessToken = options?.accessToken;
  }
}
