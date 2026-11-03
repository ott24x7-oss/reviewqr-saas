import { useEffect, type ComponentType, type ReactNode } from "react";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { QrCode } from "lucide-react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSpring, withTiming } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useI18n } from "../i18n";
import { fonts } from "../theme";
import { Badge } from "./bits";
import { tapLight } from "./haptics";
import {
  AgentBusinessesTabIcon,
  AgentEarningsTabIcon,
  AgentTeamTabIcon,
  HomeTabIcon,
  MeTabIcon,
  MoreTabIcon,
  OrdersTabIcon,
  ShopTabIcon
} from "./tab-icons";
import { useTheme } from "./theme";
import { withOpacity } from "./tokens";
import { OWNER_TAB_SLOTS, OWNER_VISIBLE_TABS, ownerShowQrTarget } from "../nav/owner-tabs";

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
  more: MeTabIcon,
  shop: ShopTabIcon,
  "agent-home": HomeTabIcon,
  "agent-businesses": AgentBusinessesTabIcon,
  "agent-team": AgentTeamTabIcon,
  "agent-earnings": AgentEarningsTabIcon,
  "agent-more": MoreTabIcon
};

type TabRoute = { key: string; name: string; params?: object };

function QrTabButton({
  backgroundColor,
  label,
  reduceMotion,
  onPress
}: {
  backgroundColor: string;
  label: string;
  reduceMotion: boolean;
  onPress: () => void;
}) {
  const { palette } = useTheme();
  const { lang } = useI18n();
  const scale = useSharedValue(1);
  const pressStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Show QR"
      onPressIn={() => { scale.value = reduceMotion ? 0.94 : withTiming(0.94, { duration: 75 }); }}
      onPressOut={() => { scale.value = reduceMotion ? 1 : withSpring(1, { damping: 16, stiffness: 260 }); }}
      onPress={onPress}
      style={styles.qrSlot}
    >
      <Animated.View style={[styles.qrButton, { backgroundColor: palette.primary, borderColor: backgroundColor, shadowColor: palette.ink }, pressStyle]}>
        <QrCode color={palette.onPrimary} size={26} strokeWidth={2} />
      </Animated.View>
      <Text numberOfLines={1} style={[styles.qrLabel, { color: palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
    </Pressable>
  );
}

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
  const { lang, t } = useI18n();
  const insets = useSafeAreaInsets();
  const ownerTabs = new Set<string>(OWNER_VISIBLE_TABS);
  const agentTabs = new Set(["agent-home", "agent-businesses", "agent-earnings", "agent-more", ...(canRecruit ? ["agent-team"] : [])]);
  const visibleTabs = mode === "agent" ? agentTabs : ownerTabs;
  const routes = state.routes.filter((route) => visibleTabs.has(route.name) && route.name in ICONS);
  const selectedRoute = state.routes[state.index];
  const hideForCustomerQr = mode === "owner" && selectedRoute?.name === "tap" && (selectedRoute.params as { section?: unknown } | undefined)?.section === "qr";
  const slots = mode === "owner" ? [...OWNER_TAB_SLOTS] : routes.map((route) => route.name);
  const index = mode === "owner"
    ? slots.findIndex((name) => name === selectedRoute?.name)
    : routes.findIndex((route) => route.key === selectedRoute?.key);
  const slide = useSharedValue(index);
  const tabWidth = useSharedValue(0);
  useEffect(() => {
    const next = index < 0 ? 0 : index;
    slide.value = reduceMotion ? next : withSpring(next, { damping: 18, stiffness: 220 });
  }, [index, reduceMotion, slide]);
  const pill = useAnimatedStyle(() => ({
    transform: [{ translateX: slide.value * tabWidth.value + Math.max(0, (tabWidth.value - 42) / 2) }]
  }));
  const barBackground = palette.cinematic
    ? withOpacity(palette.bg, Platform.OS === "android" || Platform.OS === "web" ? 0.85 : 0.42)
    : palette.card;

  if (hideForCustomerQr) return null;

  return (
    <View style={[styles.bar, {
      backgroundColor: barBackground,
      borderColor: palette.line,
      paddingBottom: Math.max(8, insets.bottom)
    }]}>
      {palette.cinematic && Platform.OS !== "android" && Platform.OS !== "web" ? (
        <BlurView tint="dark" intensity={48} style={StyleSheet.absoluteFill} />
      ) : null}
      <View
        style={styles.row}
        onLayout={(event) => {
          tabWidth.value = event.nativeEvent.layout.width / Math.max(1, slots.length);
        }}
      >
        {slots.map((slot) => {
          if (mode === "owner" && slot === "qr") {
            return (
              <QrTabButton
                key="qr"
                backgroundColor={barBackground}
                label={t.showQr}
                reduceMotion={reduceMotion}
                onPress={() => {
                  tapLight();
                  router.push(ownerShowQrTarget());
                }}
              />
            );
          }
          const route = routes.find((item) => item.name === slot);
          if (!route) return <View key={slot} style={styles.tab} />;
          const focused = route.key === selectedRoute?.key;
          const Icon = ICONS[route.name];
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
              <Text numberOfLines={1} ellipsizeMode="tail" style={[styles.label, { color: focused ? palette.ink : palette.muted }, lang === "hi" && styles.hindi]}>{label}</Text>
            </Pressable>
          );
        })}
        {index >= 0 ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.pill,
              { backgroundColor: palette.accentSoft, width: 42 },
              pill
            ]}
          />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { borderTopWidth: 1, paddingTop: 6, overflow: "visible", zIndex: 10, elevation: 10 },
  row: { flexDirection: "row", minHeight: 64, position: "relative" },
  tab: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "center", gap: 2, zIndex: 1 },
  qrSlot: { flex: 1, minHeight: 48, alignItems: "center", justifyContent: "flex-start", zIndex: 2, overflow: "visible" },
  qrButton: { width: 60, height: 60, borderRadius: 30, borderWidth: 4, alignItems: "center", justifyContent: "center", marginTop: -30, elevation: 10, shadowOffset: { width: 0, height: 3 }, shadowOpacity: 0.24, shadowRadius: 5 },
  qrLabel: { fontFamily: fonts.bodyStrong, fontSize: 12, marginTop: 0, maxWidth: "100%" },
  iconWrap: { width: 30, height: 30, alignItems: "center", justifyContent: "center" },
  badgeSlot: { position: "absolute", top: -6, right: -10 },
  label: { fontFamily: fonts.bodyStrong, fontSize: 12, includeFontPadding: false, textAlign: "center", maxWidth: "100%" },
  badge: { position: "absolute", top: -4, right: -8, minWidth: 16, height: 16, borderRadius: 8, alignItems: "center", justifyContent: "center", paddingHorizontal: 3 },
  pill: { position: "absolute", top: 8, left: 0, height: 34, borderRadius: 16, zIndex: 0 },
  hindi: { fontFamily: fonts.hindi }
});
