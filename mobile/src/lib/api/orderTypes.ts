/** Mall aggregate: `0` pending, `1` paid, `2` cancelled. */
export type OrderStatus = 0 | 1 | 2;

export const ORDER_STATUS_PENDING = 0 as const;
export const ORDER_STATUS_PAID = 1 as const;
export const ORDER_STATUS_CANCELLED = 2 as const;

export function orderStatusLabel(status: OrderStatus): string {
  switch (status) {
    case ORDER_STATUS_PENDING:
      return "pending";
    case ORDER_STATUS_PAID:
      return "paid";
    case ORDER_STATUS_CANCELLED:
      return "cancelled";
    default: {
      const _exhaustive: never = status;
      return String(_exhaustive);
    }
  }
}

export type OrderLine = {
  pid: number;
  quantity: number;
  unit_price: number;
  /** Present when the order API embeds product copy on each line. */
  title?: string;
  thumbnail?: string;
};

export type OrderSummary = {
  id: number;
  uid: number;
  status: OrderStatus;
  total_price: number;
  ct: number;
  ut: number;
};

export type OrderDetail = OrderSummary & {
  lines: OrderLine[];
  /** Set after `POST /api/mall/checkout`; `0` before checkout. */
  points_deduct_minor: number;
  /** Cash to pay via third party; `0` before checkout. */
  cash_payable_minor: number;
  /** Present on coordinated checkout orders when API returns them. */
  ext_inventory?: boolean;
  checkout_phase?: number;
  tid?: string;
};

export type OrderPagination = {
  total: number;
  per_page: number;
  current_page: number;
  last_page: number;
};

export type OrderListResult = {
  items: OrderSummary[];
  pagination: OrderPagination;
};
