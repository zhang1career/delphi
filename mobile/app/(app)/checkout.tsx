import { Redirect } from "expo-router";

/** Checkout is handled on the cart tab: `POST /api/mall-agg/orders` then `POST /api/mall-agg/checkout`. */
export default function CheckoutScreen() {
  return <Redirect href="/(app)/(tabs)/cart" />;
}
