import type { CommerceRepository } from "./commerceRepo";
import type { FeedItem, Product } from "./types";

const products: Product[] = [
  {
    id: "1",
    title: "Studio Headphones",
    priceCents: 19900,
    imageUrl: "https://picsum.photos/seed/p1/400/400",
    description: "Closed-back, comfortable for long sessions.",
    mainMediaKeys: [
      "https://picsum.photos/seed/p1a/800/500",
      "https://picsum.photos/seed/p1b/800/500",
    ],
    extMediaKeys: ["https://picsum.photos/seed/p1x/800/400", "https://picsum.photos/seed/p1y/800/400"],
    stockQuantity: 12,
  },
  {
    id: "2",
    title: "Mechanical Keyboard",
    priceCents: 14900,
    imageUrl: "https://picsum.photos/seed/p2/400/400",
    description: "Hot-swappable switches, compact 75% layout.",
    mainMediaKeys: ["https://picsum.photos/seed/p2a/800/500"],
    extMediaKeys: ["https://picsum.photos/seed/p2x/800/400"],
    stockQuantity: 4,
  },
  {
    id: "3",
    title: "USB-C Hub",
    priceCents: 5900,
    imageUrl: "https://picsum.photos/seed/p3/400/400",
    description: "HDMI, SD, and three USB-A ports.",
    mainMediaKeys: ["https://picsum.photos/seed/p3a/800/500"],
    stockQuantity: 0,
  },
];

const feed: FeedItem[] = [
  {
    id: "f1",
    author: "River",
    body: "Shipped a new feed layout with pull-to-refresh.",
    createdAt: "2026-04-01T10:00:00Z",
  },
  {
    id: "f2",
    author: "Morgan",
    body: "Mock data only — swap `getCommerceRepo()` for HTTP.",
    createdAt: "2026-04-02T14:30:00Z",
  },
];

function delay<T>(value: T, ms = 280): Promise<T> {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export const mockCommerceRepository: CommerceRepository = {
  async listProducts(params = {}) {
    const page = params.page ?? 1;
    const perPage = params.per_page ?? 15;
    const all = [...products];
    const start = (page - 1) * perPage;
    const items = all.slice(start, start + perPage);
    const lastPage = Math.max(1, Math.ceil(all.length / perPage));
    return delay({
      items,
      pagination: {
        total: all.length,
        per_page: perPage,
        current_page: page,
        last_page: lastPage,
      },
    });
  },
  async getProduct(id: string) {
    return delay(products.find((p) => p.id === id) ?? null);
  },
  async searchProductIds(query: string) {
    const t = query.trim().toLowerCase();
    if (!t) {
      return delay([]);
    }
    const ids = products.filter((p) => p.title.toLowerCase().includes(t)).map((p) => p.id);
    return delay(ids);
  },
  async listFeed() {
    return delay([...feed]);
  },
};
