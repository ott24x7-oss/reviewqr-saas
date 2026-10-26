import { useEffect, type ComponentType, type ReactNode } from "react";
import { BlurView } from "expo-blur";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Badge } from "./bits";
import { tapLight } from "./haptics";
import {
  AgentBusinessesTabIcon,
  AgentEarningsTabIcon,
  AgentTeamTabIcon,
  FeedbackTabIcon,
  HomeTabIcon,
  MenuTabIcon,
  MoreTabIcon,
  OrdersTabIcon
} from "./tab-icons";
import { useTheme } from "./theme";
import { withOpacity } from "./tokens";

function TabIcon({ focused, children }: { focused: boolean; children: ReactNode }) {
  const { reduceMotion } = useTheme();
  const scale = useSharedValue(focused ? 1.1 : 1);
  useEffect(() => {
    const next = focused ? 1.1 : 1;
    scale.value = reduceMotion ? next : withSpring(next, { damping: 15, stiffness: 220 });
  }, [focused, reduceMotion, scale]);
  const anim = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return <Animated.View style={anim}>{children}</Animated.View>;
}

const ICONS: Record<string, ComponentType<{ color: string }>> = {
  index: HomeTabIcon,
  orders: OrdersTabIcon,
  menu: MenuTabIcon,
  feedback: FeedbackTabIcon,
  more: MoreTabIcon,
  "agent-home": HomeTabIcon,
  "agent-businesses": AgentBusinessesTabIcon,
  "agent-team": AgentTeamTabIcon,
  "agent-earnings": AgentEarningsTabIcon,
  "agent-more": MoreTabIcon
};

type TabRoute = { key: string; name: string };

export function PremiumTabBar({
  state,
  descriptors,
  onTabPress,
  badges,
  mode = "owner",
  canRecruit = true
}: {
  state: { index: number; routes: TabRoute[] };
  descriptors: Record<string, { options?: { title?: string } }>;
  onTabPress: (route: TabRoute, focused: boolean) => void;
  badges?: Record<string, number>;
  mode?: "owner" | "agent";
  canRecruit?: boolean;
}) {
  const { palette, reduceMotion } = useTheme();
  const { lang } = useI18n();
  const insets = useSafeAreaInsets();
  const ownerTabs = new Set(["index", "orders", "menu", "feedback", "more"]);
  const agentTabs = new Set(["agent-home", "agent-businesses", "agent-earnings", "agent-more", ...(canRecruit ? ["agent-team"] : [])]);
  const visibleTabs = mode === "agent" ? agentTabs : ownerTabs;
  const routes = state.routes.filter((route) => visibleTabs.has(route.name) && route.name in ICONS);
  const index = routes.findIndex((route) => route.key === state.routes[state.index]?.key);
  const slide = useSharedValue(index);
  const tabWidth = useSharedValue(0);
  useEffect(() => {
    const next = index < 0 ? 0 : index;
    slide.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 220 });
  }, [index, reduceMotion, slide]);
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * tabWidth.value }]
  }));

  return (
    <View style={[styles.bar, {
      backgroundColor: palette.cinematic
        ? withOpacity(palette.bg, Platform.OS === "android" || Platform.OS === "web" ? 0.85 : 0.42)
        : palette.card,
      borderColor: palette.line,
      paddingBottom: Math.max(8, insets.bottom)
    }]}>
      {palette.cinematic && Platform.OS !== "android" && Platform.OS !== "web" ? (
        <BlurView tint="dark" intensity={48} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={styles.row}
        onLayout={(event) => {
          tabWidth.value = event.nativeEvent.layout.width / Math.max(1, routes.length);
        }}
      >
        {routes.map((route, position) => {
          const focused = position === index && index >= 0;
          const Icon = ICONS[route.name as keyof typeof ICONS];
          const options = descriptors[route.key]?.options;
          const label = options?.title || route.name;
          const badge = badges?.[route.name] ?? 0;
          return (
            <Pressable
              key={route.key}
              accessibilityRole="tab"
              accessibilityState={{ selected: focused }}
              accessibilityLabel={label}
              onPress={() => {
                tapLight();
                onTabPress(route, focused);
              }}
              style={styles.tab}
            >
              <TabIcon focused={focused}>
                <View style={styles.iconWrap}>
                  <Icon color={focused ? palette.deep : palette.muted} />
                  <View style={styles.badgeSlot}>
                    <Badge count={badge} label={label} />
                  </View>
                </View>
              </TabIcon>
              <Text style={[styles.label, { color: focused ? palette.ink : palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
            </Pressable>
          );
        })}
        {index >= 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              { backgroundColor: palette.accentSoft, width: `${100 / Math.max(1, routes.length)}%` as `${number}%` },
              pill
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, paddingTop: 6, overflow: "hidden" },
  row: { flexDirection: "row", minHeight: 56, position: "relative" },
  tab: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 2, zIndex: 1 },
  iconWrap: { width: 28, height: 28, alignItems: "center", justifyContent: "center" },
  badgeSlot: { position: "absolute", top: -6, right: -10 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 12 },
  badge: { position: "absolute", top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  pill: { position: "absolute", top: 4, bottom: 4, left: 0, borderRadius: 16 },
  hindi: { fontFamily: fonts.hindi }
});
