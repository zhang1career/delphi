import Ionicons from "@expo/vector-icons/Ionicons";
import type { BottomTabBarProps } from "@react-navigation/bottom-tabs";
import { BottomTabBar, BottomTabBarHeightCallbackContext } from "@react-navigation/bottom-tabs";
import * as React from "react";
import {
  Platform,
  Pressable,
  Text,
  View,
  useWindowDimensions,
  type LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { features } from "@/lib/config";

type TabHrefOptions = {
  /** Expo Router: `href: null` removes tab entry. */
  href?: unknown;
};

type TabRouteMeta = {
  route: BottomTabBarProps["state"]["routes"][number];
  index: number;
};

/**
 * Native: standard bottom tabs. Web: horizontal top navigation for the same tab routes;
 * **About** is pinned to the trailing edge on wide viewports.
 */
export function BetTabBar(props: BottomTabBarProps): React.ReactElement {
  const { state, descriptors, navigation } = props;

  const window = useWindowDimensions();
  const safe = useSafeAreaInsets();
  const padHorizontal = Math.max(16, (window.width - 900) / 2);
  const onTabBarHeight = React.useContext(BottomTabBarHeightCallbackContext);

  if (Platform.OS !== "web") {
    return <BottomTabBar {...props} />;
  }

  const handleLayout = (e: LayoutChangeEvent): void => {
    const h = e.nativeEvent.layout.height;
    onTabBarHeight?.(h);
  };

  const visibleMetas: TabRouteMeta[] = [];
  for (let index = 0; index < state.routes.length; index++) {
    const route = state.routes[index];
    const optsHref = descriptors[route.key]?.options as TabHrefOptions | undefined;
    if (optsHref?.href === null) {
      continue;
    }
    if (!features.cart && route.name === "cart") {
      continue;
    }
    if (!features.commerce && route.name === "index") {
      continue;
    }
    visibleMetas.push({ route, index });
  }

  const mainMetas = visibleMetas.filter((m) => m.route.name !== "about");
  const aboutMeta = visibleMetas.find((m) => m.route.name === "about");

  const renderChip = (route: TabRouteMeta["route"], stackIndex: number): React.ReactElement => {
    const opts = descriptors[route.key]?.options ?? {};
    const isFocused = state.index === stackIndex;
    const labelRaw = opts.tabBarLabel ?? opts.title ?? route.name;
    const label = typeof labelRaw === "string" ? labelRaw : String(route.name);
    const color = isFocused ? "#a5b4fc" : "#64748b";
    let iconFn = opts.tabBarIcon;
    if (typeof iconFn !== "function") {
      iconFn = fallbackIcon(route.name as string);
    }

    const onPress = (): void => {
      const ev = navigation.emit({
        type: "tabPress",
        target: route.key,
        canPreventDefault: true,
      });
      if (!ev.defaultPrevented && !isFocused) {
        navigation.navigate(route.name);
      }
    };

    const iconFnTyped = iconFn as (p: {
      color: string;
      focused: boolean;
      size: number;
    }) => React.ReactNode;

    return (
      <Pressable
        key={route.key}
        onPress={onPress}
        accessibilityRole="tab"
        accessibilityState={isFocused ? { selected: true } : {}}
        className={`flex-row items-center gap-1.5 px-3 py-2 rounded-xl ${isFocused ? "bg-[#1e293b]" : ""}`}
      >
        {iconFnTyped({ color, focused: isFocused, size: 20 })}
        <Text className="text-sm font-semibold" style={{ color }}>
          {label}
        </Text>
      </Pressable>
    );
  };

  return (
    <View
      className="bg-[#0f172a] border-b border-[#334155]"
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        paddingTop: safe.top + 10,
        paddingBottom: 12,
        paddingLeft: padHorizontal,
        paddingRight: padHorizontal,
      }}
      onLayout={handleLayout}
    >
      <View className="w-full flex-row flex-wrap items-center gap-y-2 justify-between">
        <View className="flex-row flex-wrap gap-2 items-center flex-1 min-w-0 justify-center md:justify-start">
          {mainMetas.map(({ route, index }) => renderChip(route, index))}
        </View>
        {aboutMeta ? (
          <View className="flex-row items-center shrink-0 w-full justify-end md:w-auto md:justify-end pr-0.5">
            {renderChip(aboutMeta.route, aboutMeta.index)}
          </View>
        ) : null}
      </View>
    </View>
  );
}

function fallbackIcon(
  routeName: string,
): (p: { color: string; focused: boolean; size: number }) => React.ReactNode {
  function Icon({ color, size }: { color: string; size: number }): React.ReactElement {
    if (routeName === "index") {
      return <Ionicons name="american-football-outline" size={size} color={color} />;
    }
    if (routeName === "cart") {
      return <Ionicons name="cart-outline" size={size} color={color} />;
    }
    if (routeName === "orders") {
      return <Ionicons name="receipt-outline" size={size} color={color} />;
    }
    if (routeName === "about") {
      return <Ionicons name="information-circle-outline" size={size} color={color} />;
    }
    return <Ionicons name="person-circle-outline" size={size} color={color} />;
  }
  return Icon;
}
