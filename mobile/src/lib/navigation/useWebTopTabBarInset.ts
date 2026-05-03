import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";

/** Extra top inset on web when `BetTabBar` is pinned to the top so content clears the nav. */
export function useWebTopTabBarInset(): number {
  const tabBarHeight = useBottomTabBarHeight();
  return Platform.OS === "web" ? tabBarHeight : 0;
}
