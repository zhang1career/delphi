import type { OrderDetail } from "./orderTypes";

export type PointsBalanceData = {
  balance_minor: number;
};

/** Placeholder prepay payload from `POST /api/mall/checkout` (`StubPaymentOutboundClient`). */
export type PrepayStub = {
  order_id: number;
  amount_minor: number;
  uid: number;
  status: string;
};

export type CheckoutResponseData = {
  order: OrderDetail;
  prepay: PrepayStub;
  points_tcc_idem_key: string | null;
  tid: string;
};
