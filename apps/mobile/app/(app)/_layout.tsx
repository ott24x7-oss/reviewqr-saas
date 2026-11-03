import { useQuery } from "@tanstack/react-query";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Redirect, router, Tabs, usePathname } from "expo-router";
import { useEffect, useMemo, type ReactNode } from "react";
import * as Sentry from "@sentry/react-native";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { PrimaryButton, SecondaryButton } from "../../src/ui/buttons";
import { Screen } from "../../src/ui/screen";
import { PushBridge } from "../../src/push/register";
import { accountKey } from "../../src/query/keys";
import { BusinessProvider, useBusiness } from "../../src/state/business";
import { PlanLockHost } from "../../src/state/plan-lock";
import { useSession } from "../../src/state/session";
import { AgentModeProvider, useAgentMode } from "../../src/agent/mode-context";
import { useAgentHome, useAgentTeam } from "../../src/agent/api";
import { PendingAgentScreen } from "../../src/agent/pending-screen";
import { PENDING_AGENT_JOIN_KEY } from "../../src/agent/join-code";
import { fonts } from "../../src/theme";
import { PremiumTabBar } from "../../src/ui/tab-bar";
import { usePalette } from "../../src/ui/theme";
import { routeErrorCopy } from "../../src/ui/route-error-copy";

export function ErrorBoundary({ error, retry }: { error: Error; retry: () => void }) {
  const { lang } = useI18n();
  const palette = usePalette();
  const copy = routeErrorCopy(lang);

  useEffect(() => {
    Sentry.captureException(error);
  }, [error]);

  return (
    <Screen>
      <View style={[errorStyles.content, { backgroundColor: palette.paper }]}>
        <View style={[errorStyles.card, { backgroundColor: palette.card, borderColor: palette.line }]}>
          <Text accessibilityRole="header" style={[errorStyles.title, { color: palette.ink }, lang === "hi" && errorStyles.hindi]}>{copy.title}</Text>
          <Text style={[errorStyles.body, { color: palette.muted }, lang === "hi" && errorStyles.hindi]}>{copy.body}</Text>
          <PrimaryButton label={copy.retry} onPress={retry} />
          <SecondaryButton label={copy.home} onPress={() => router.replace("/(app)/index")} />
        </View>
      </View>
    </Screen>
  );
}

const errorStyles = StyleSheet.create({
  content: { flex: 1, justifyContent: "center", padding: 20 },
  card: { gap: 14, borderWidth: 1, borderRadius: 22, padding: 22 },
  title: { fontFamily: fonts.title, fontSize: 22, lineHeight: 28 },
  body: { fontFamily: fonts.body, fontSize: 15, lineHeight: 22 },
  hindi: { fontFamily: fonts.hindi }
});

function PanelGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { businesses, loading } = useBusiness();
  const palette = usePalette();
  const progress = useQuery({
    queryKey: accountKey(user?.id ?? "", "onboarding"),
    enabled: !!user && user.role === "USER",
    queryFn: () => apiData<{ referralAsked: boolean; completed: boolean }>("/api/v1/onboarding")
  });
  if (user?.role === "USER" && (loading || progress.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }
  if (user?.role === "USER" && businesses.length === 0 && progress.data && !progress.data.completed) {
    if (!progress.data.referralAsked) return <Redirect href="/(onboard)/referral" />;
    return <Redirect href="/(onboard)/wizard" />;
  }
  return <>{children}</>;
}

function OwnerTabs() {
  const { user } = useSession();
  const { business } = useBusiness();
  const { t, lang } = useI18n();
  const palette = usePalette();
  const id = business?.id;
  const orders = useQuery({
    queryKey: accountKey(user?.id ?? "", "orders", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: { status: string }[] }>(`/api/v1/orders?limit=30&businessId=${id}`, {}, { planSheet: false })
  });
  const feedback = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: { status: string }[] }>(`/api/v1/feedback?limit=30&businessId=${id}`, {}, { planSheet: false })
  });
  const badges = useMemo(
    () => ({
      orders: (orders.data?.items ?? []).filter((row) => row.status === "NEW" || row.status === "ACCEPTED").length,
      reviews: (feedback.data?.items ?? []).filter((row) => row.status === "NEW").length
    }),
    [orders.data, feedback.data]
  );
  const label = lang === "hi" ? fonts.hindiStrong : fonts.bodyStrong;
  return (
    <Tabs
      tabBar={(props) => (
        <PremiumTabBar
          state={props.state}
          descriptors={props.descriptors}
          badges={badges}
          mode="owner"
          onTabPress={(route, focused) => {
            const event = props.emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) props.navigateToTab(route.key);
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: palette.paper },
        headerTintColor: palette.ink,
        headerTitleStyle: { fontFamily: label },
        tabBarStyle: { backgroundColor: palette.card, minHeight: 64 }
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.home }} />
      <Tabs.Screen name="orders" options={{ title: t.orders }} />
      {/* The custom bar filters Reviews out, while the route stays programmatically reachable. */}
      <Tabs.Screen name="reviews" options={{ title: t.reviews }} />
      <Tabs.Screen name="shop" options={{ title: t.shop }} />
      <Tabs.Screen name="more" options={{ title: t.meTab }} />
      <Tabs.Screen name="analytics" options={{ title: t.analytics }} />
      <Tabs.Screen name="menu" options={{ title: t.menuTab }} />
      <Tabs.Screen name="services" options={{ title: t.services }} />
      <Tabs.Screen name="bookings" options={{ title: t.bookings }} />
      <Tabs.Screen name="booking-detail" options={{ title: t.bookingDetail }} />
      <Tabs.Screen name="feedback" options={{ title: t.feedbackTab }} />
      <Tabs.Screen name="business-new" options={{ title: t.addBusiness }} />
      <Tabs.Screen name="business-edit" options={{ title: t.businessDetails }} />
      {/* Keep tap navigable from in-app actions; the custom tab bar filters it out. */}
      <Tabs.Screen name="tap" options={{ title: t.preview }} />
      <Tabs.Screen name="nfc" options={{ title: t.nfc }} />
      <Tabs.Screen name="delete-account" options={{ title: t.deleteAccount }} />
      <Tabs.Screen name="help" options={{ title: t.help }} />
      <Tabs.Screen name="plan" options={{ title: t.plans }} />
      <Tabs.Screen name="staff" options={{ title: t.staff }} />
      <Tabs.Screen name="store" options={{ title: t.storeSettings }} />
      <Tabs.Screen name="order-detail" options={{ title: t.viewDetails }} />
      <Tabs.Screen name="customers" options={{ title: t.customers }} />
      <Tabs.Screen name="offers" options={{ title: t.offers }} />
      <Tabs.Screen name="campaigns" options={{ title: t.campaigns }} />
      <Tabs.Screen name="refer" options={{ title: t.referEarn }} />
      <Tabs.Screen name="qr-codes" options={{ title: t.qrList }} />
      <Tabs.Screen name="inbox" options={{ title: t.inbox }} />
      <Tabs.Screen name="account" options={{ title: t.account }} />
      <Tabs.Screen name="theme" options={{ title: t.appLook }} />
      <Tabs.Screen name="agent" options={{ title: t.agentHome }} />
      <Tabs.Screen name="agent-home" options={{ title: t.agentHomeTab }} />
      <Tabs.Screen name="agent-join" options={{ title: t.agentJoin }} />
      <Tabs.Screen name="agent-pending" options={{ title: t.agentWaitingTitle }} />
      <Tabs.Screen name="agent-reseller" options={{ title: t.resellerTitle }} />
      <Tabs.Screen name="agent-application" options={{ title: t.resellerApplicationTitle }} />
    </Tabs>
  );
}

function AgentTabs() {
  const { t, lang } = useI18n();
  const palette = usePalette();
  const pathname = usePathname();
  const home = useAgentHome();
  const team = useAgentTeam(home.data?.status === "ACTIVE");
  const label = lang === "hi" ? fonts.hindiStrong : fonts.bodyStrong;

  useEffect(() => {
    if (home.data?.status === "PENDING") return;
    if (/^\/agent-(home|businesses|team|earnings|more|member|onboard|payouts|profile|how|join|pending)$/.test(pathname) || pathname.startsWith("/agent/join/")) return;
    router.replace("/(app)/agent-home");
  }, [home.data?.status, pathname]);

  if (home.data?.status === "PENDING") return <PendingAgentScreen />;
  const canRecruit = team.data?.canRecruit !== false;
  return (
    <Tabs
      tabBar={(props) => (
        <PremiumTabBar
          state={props.state}
          descriptors={props.descriptors}
          mode="agent"
          canRecruit={canRecruit}
          onTabPress={(route, focused) => {
            const event = props.emitter.emit({ type: "tabPress", target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) props.navigateToTab(route.key);
          }}
        />
      )}
      screenOptions={{
        headerShown: false,
        headerStyle: { backgroundColor: palette.paper },
        headerTintColor: palette.ink,
        headerTitleStyle: { fontFamily: label },
        tabBarStyle: { backgroundColor: palette.card, minHeight: 64 }
      }}
    >
      <Tabs.Screen name="agent-home" options={{ title: t.agentHomeTab }} />
      <Tabs.Screen name="agent-businesses" options={{ title: t.agentBusinessesTab }} />
      <Tabs.Screen name="agent-team" options={{ title: t.agentTeamTab }} />
      <Tabs.Screen name="agent-earnings" options={{ title: t.agentEarningsTab }} />
      <Tabs.Screen name="agent-more" options={{ title: t.agentMoreTab }} />
      <Tabs.Screen name="agent-member" options={{ title: t.agentTeamTab }} />
      <Tabs.Screen name="agent-onboard" options={{ title: t.onboardBusiness }} />
      <Tabs.Screen name="agent-payouts" options={{ title: t.agentPayouts }} />
      <Tabs.Screen name="agent-profile" options={{ title: t.agentProfile }} />
      <Tabs.Screen name="agent-how" options={{ title: t.agentHowTitle }} />
      <Tabs.Screen name="agent-join" options={{ title: t.agentJoin }} />
      <Tabs.Screen name="agent-pending" options={{ title: t.agentWaitingTitle }} />
      <Tabs.Screen name="agent-reseller" options={{ title: t.resellerTitle }} />
      <Tabs.Screen name="agent-application" options={{ title: t.resellerApplicationTitle }} />
      <Tabs.Screen name="agent" options={{ title: t.agentHome }} />
    </Tabs>
  );
}

function ModeTabs() {
  const { user } = useSession();
  const { loading } = useBusiness();
  const { mode, ready } = useAgentMode();
  const palette = usePalette();
  if (user?.role === "AGENT" && (!ready || (mode === "owner" && loading))) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: palette.paper }}>
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }
  return user?.role === "AGENT" && mode === "agent" ? <AgentTabs /> : <OwnerTabs />;
}

function PendingAgentJoinRedirect() {
  const { user } = useSession();
  const pathname = usePathname();
  useEffect(() => {
    if (!user || user.role !== "USER" || pathname.includes("agent-join")) return;
    AsyncStorage.getItem(PENDING_AGENT_JOIN_KEY)
      .then(async (code) => {
        if (!code) return;
        await AsyncStorage.removeItem(PENDING_AGENT_JOIN_KEY).catch(() => undefined);
        router.replace({ pathname: "/(app)/agent-join", params: { code } });
      })
      .catch(() => undefined);
  }, [pathname, user]);
  return null;
}

export default function AppLayout() {
  const { ready, user } = useSession();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  return (
    <BusinessProvider>
    <PlanLockHost />
    <PendingAgentJoinRedirect />
    <PanelGate>
      <AgentModeProvider>
        <PushBridge />
        <ModeTabs />
      </AgentModeProvider>
    </PanelGate>
    </BusinessProvider>
  );
}
