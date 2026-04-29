import type { CommerceRepository } from "./commerceRepo";
import { createDefaultCommerceRepository } from "./mallCommerce";

let repo: CommerceRepository = createDefaultCommerceRepository();

export function getCommerceRepo(): CommerceRepository {
  return repo;
}

/** Swap for a real HTTP adapter without touching UI. */
export function setCommerceRepo(next: CommerceRepository) {
  repo = next;
}

export type { CommerceRepository } from "./commerceRepo";
export type { FeedItem, Product } from "./types";
