import { useQuery } from "@tanstack/react-query";
import { Redirect, Tabs } from "expo-router";
import { type ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";
import { apiData } from "../../src/api/data";
import { useI18n } from "../../src/i18n";
import { PushBridge } from "../../src/push/register";
import { accountKey } from "../../src/query/keys";
import { BusinessProvider, useBusiness } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { colors, fonts } from "../../src/theme";

function PanelGate({ children }: { children: ReactNode }) {
  const { user } = useSession();
  const { businesses, loading } = useBusiness();
  const progress = useQuery({
    queryKey: accountKey(user?.id ?? "", "onboarding"),
    enabled: !!user && user.role === "USER",
    queryFn: () => apiData<{ referralAsked: boolean; completed: boolean }>("/api/v1/onboarding")
  });
  if (user?.role === "USER" && (loading || progress.isLoading)) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.ink} />
      </View>
    );
  }
  if (user?.role === "USER" && businesses.length === 0 && progress.data && !progress.data.completed) {
    if (!progress.data.referralAsked) return <Redirect href="/(onboard)/referral" />;
    return <Redirect href="/(onboard)/wizard" />;
  }
  return <>{children}</>;
}

export default function AppLayout() {
  const { ready, user } = useSession();
  const { t, lang } = useI18n();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  const label = lang === "hi" ? fonts.hindiStrong : fonts.bodyStrong;
  return (
    <BusinessProvider>
    <PushBridge />
    <PanelGate>
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.paper },
        headerTintColor: colors.ink,
        headerTitleStyle: { fontFamily: label },
        tabBarStyle: { backgroundColor: colors.card, minHeight: 64, paddingBottom: 8, paddingTop: 8 },
        tabBarActiveTintColor: colors.ink,
        tabBarInactiveTintColor: colors.inkSoft,
        tabBarLabelStyle: { fontFamily: label, fontSize: 12 }
      }}
    >
      <Tabs.Screen name="index" options={{ title: t.home }} />
      <Tabs.Screen name="analytics" options={{ title: t.analytics }} />
      <Tabs.Screen name="orders" options={{ title: t.orders }} />
      <Tabs.Screen name="menu" options={{ title: t.menuTab }} />
      <Tabs.Screen name="feedback" options={{ title: t.feedbackTab }} />
      <Tabs.Screen name="more" options={{ title: t.more }} />
      <Tabs.Screen name="shop" options={{ href: null, title: t.shop }} />
      <Tabs.Screen name="business-new" options={{ href: null, title: t.addBusiness }} />
      <Tabs.Screen name="business-edit" options={{ href: null, title: t.businesses }} />
      <Tabs.Screen name="tap" options={{ href: null, title: t.preview }} />
      <Tabs.Screen name="nfc" options={{ href: null, title: t.nfc }} />
      <Tabs.Screen name="delete-account" options={{ href: null, title: t.deleteAccount }} />
      <Tabs.Screen name="plan" options={{ href: null, title: t.plans }} />
      <Tabs.Screen name="staff" options={{ href: null, title: t.staff }} />
      <Tabs.Screen name="store" options={{ href: null, title: t.storeSettings }} />
    </Tabs>
    </PanelGate>
    </BusinessProvider>
  );
}
