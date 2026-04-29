import { create } from "zustand";
import type { Product } from "@/lib/api/types";
import { mallProductImageUri } from "@/lib/mallCdn";

export type CartLine = {
  productId: string;
  title: string;
  priceCents: number;
  qty: number;
  /** Resolved thumbnail URI (CDN or fallback). */
  imageUri: string;
};

function lineImageUri(product: Product): string {
  const thumbOrMain = product.thumbnail ?? product.mainMediaKeys?.[0];
  return mallProductImageUri(thumbOrMain, product.imageUrl);
}

type CartState = {
  lines: CartLine[];
  add: (product: Product, qty?: number) => void;
  removeLine: (productId: string) => void;
  incrementQty: (productId: string) => void;
  decrementQty: (productId: string) => void;
  clear: () => void;
};

export const useCartStore = create<CartState>((set, get) => ({
  lines: [],
  add: (product, qty = 1) => {
    const { lines } = get();
    const imageUri = lineImageUri(product);
    const i = lines.findIndex((l) => l.productId === product.id);
    if (i >= 0) {
      const next = [...lines];
      next[i] = {
        ...next[i],
        qty: next[i].qty + qty,
        title: product.title,
        priceCents: product.priceCents ?? 0,
        imageUri: imageUri || next[i].imageUri,
      };
      set({ lines: next });
      return;
    }
    set({
      lines: [
        ...lines,
        {
          productId: product.id,
          title: product.title,
          priceCents: product.priceCents ?? 0,
          qty,
          imageUri,
        },
      ],
    });
  },
  removeLine: (productId) =>
    set({ lines: get().lines.filter((l) => l.productId !== productId) }),
  incrementQty: (productId) => {
    const { lines } = get();
    const i = lines.findIndex((l) => l.productId === productId);
    if (i < 0) {
      return;
    }
    const next = [...lines];
    next[i] = { ...next[i], qty: next[i].qty + 1 };
    set({ lines: next });
  },
  decrementQty: (productId) => {
    const { lines } = get();
    const i = lines.findIndex((l) => l.productId === productId);
    if (i < 0) {
      return;
    }
    const q = lines[i].qty;
    if (q <= 0) {
      return;
    }
    const next = [...lines];
    next[i] = { ...next[i], qty: q - 1 };
    set({ lines: next });
  },
  clear: () => set({ lines: [] }),
}));

export function cartTotalCents(lines: CartLine[]) {
  return lines.reduce((sum, l) => sum + l.priceCents * l.qty, 0);
}
