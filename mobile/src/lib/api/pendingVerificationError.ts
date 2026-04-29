/** HTTP 200 + `errorCode` 304: same notice target already has a pending verify flow (register, reset password, etc.). */
export const PENDING_VERIFICATION_ERROR_CODE = 304;

export class PendingVerificationError extends Error {
  readonly errorCode: number;
  readonly eventId?: number;
  readonly detail?: string;

  constructor(
    message: string,
    errorCode: number,
    options?: { eventId?: number; detail?: string },
  ) {
    super(message);
    this.name = "PendingVerificationError";
    this.errorCode = errorCode;
    this.eventId = options?.eventId;
    this.detail = options?.detail;
  }
}
