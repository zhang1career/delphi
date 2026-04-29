import { create } from "zustand";

type ProductListSession = {
  productIds: string[];
  /** Shown in the list screen header (e.g. search query or campaign name). */
  headerTitle: string;
};

type ProductListState = ProductListSession & {
  setFromSearch: (productIds: string[], query: string) => void;
  setFromCampaign: (productIds: string[], title: string) => void;
};

/** Default header when no search/campaign session is active. */
export const PRODUCT_LIST_DEFAULT_HEADER = "商品列表";

export const useProductListStore = create<ProductListState>((set) => ({
  productIds: [],
  headerTitle: PRODUCT_LIST_DEFAULT_HEADER,
  setFromSearch: (productIds, query) =>
    set({
      productIds,
      headerTitle: query.trim() ? `搜索：${query.trim()}` : PRODUCT_LIST_DEFAULT_HEADER,
    }),
  setFromCampaign: (productIds, title) =>
    set({
      productIds,
      headerTitle: title.trim() || PRODUCT_LIST_DEFAULT_HEADER,
    }),
}));
