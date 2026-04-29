export type Product = {
  id: string;
  title: string;
  /** Minor units when `currency` is MINOR; `null` when API has no price. */
  priceCents: number | null;
  /** Full URL for hero/mock; list/detail prefer CDN when `thumbnail` is set. */
  imageUrl: string;
  /** CMS thumbnail filename/key; loaded via mall CDN when present. */
  thumbnail?: string;
  /** Detail/list: comma-separated `main_media` from API, split; same CDN rules as `thumbnail`. */
  mainMediaKeys?: string[];
  /** Detail: comma-separated `ext_media` from API, split. */
  extMediaKeys?: string[];
  description: string;
  /** Present on detail responses only. */
  stockQuantity?: number;
};

export type FeedItem = {
  id: string;
  author: string;
  body: string;
  createdAt: string;
};
