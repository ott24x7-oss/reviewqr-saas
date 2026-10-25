import { useQuery } from "@tanstack/react-query";
import { Redirect, Tabs } from "expo-router";
import { useMemo, type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { PushBridge } from "../../src/push/register";
import { accountKey } from "../../src/query/keys";
import { BusinessProvider, useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { fonts } from "../../src/theme";
import { PremiumTabBar } from "../../src/ui/tab-bar";
import { usePalette } from "../../src/ui/theme";

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

function AppTabs() {
  const { user } = useSession();
  const { business } = useBusiness();
  const { t, lang } = useI18n();
  const palette = usePalette();
  const id = business?.id;
  const orders = useQuery({
    queryKey: accountKey(user?.id ?? "", "orders", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: { status: string }[] }>(`/api/v1/orders?limit=30&businessId=${id}`)
  });
  const feedback = useQuery({
    queryKey: accountKey(user?.id ?? "", "feedback", id),
    enabled: !!user && !!id,
    queryFn: () => apiData<{ items: { status: string }[] }>(`/api/v1/feedback?limit=30&businessId=${id}`)
  });
  const badges = useMemo(
    () => ({
      orders: (orders.data?.items ?? []).filter((row) => row.status === "NEW" || row.status === "ACCEPTED").length,
      feedback: (feedback.data?.items ?? []).filter((row) => row.status !== "RESOLVED").length
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
      <Tabs.Screen name="analytics" options={{ title: t.analytics }} />
      <Tabs.Screen name="orders" options={{ title: t.orders }} />
      <Tabs.Screen name="menu" options={{ title: t.menuTab }} />
      <Tabs.Screen name="feedback" options={{ title: t.feedbackTab }} />
      <Tabs.Screen name="more" options={{ title: t.more }} />
      <Tabs.Screen name="shop" options={{ title: t.shop }} />
      <Tabs.Screen name="business-new" options={{ title: t.addBusiness }} />
      <Tabs.Screen name="business-edit" options={{ title: t.businesses }} />
      <Tabs.Screen name="tap" options={{ title: t.preview }} />
      <Tabs.Screen name="nfc" options={{ title: t.nfc }} />
      <Tabs.Screen name="delete-account" options={{ title: t.deleteAccount }} />
      <Tabs.Screen name="help" options={{ title: t.help }} />
      <Tabs.Screen name="plan" options={{ title: t.plans }} />
      <Tabs.Screen name="staff" options={{ title: t.staff }} />
      <Tabs.Screen name="store" options={{ title: t.storeSettings }} />
      <Tabs.Screen name="order-detail" options={{ title: t.viewDetails, href: null }} />
      <Tabs.Screen name="reviews" options={{ title: t.reviews, href: null }} />
      <Tabs.Screen name="customers" options={{ title: t.customers, href: null }} />
      <Tabs.Screen name="offers" options={{ title: t.offers, href: null }} />
      <Tabs.Screen name="campaigns" options={{ title: t.campaigns, href: null }} />
      <Tabs.Screen name="refer" options={{ title: t.referEarn, href: null }} />
      <Tabs.Screen name="qr-codes" options={{ title: t.qrList, href: null }} />
      <Tabs.Screen name="inbox" options={{ title: t.inbox, href: null }} />
      <Tabs.Screen name="account" options={{ title: t.account, href: null }} />
      <Tabs.Screen name="agent" options={{ title: t.agentHome, href: null }} />
    </Tabs>
  );
}

export default function AppLayout() {
  const { ready, user } = useSession();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  return (
    <BusinessProvider>
    <PushBridge />
    <PanelGate>
      <AppTabs />
    </PanelGate>
    </BusinessProvider>
  );
}
