import { Redirect, Tabs } from "expo-router";
import { BusinessProvider } from "../../src/state/business";
import { useSession } from "../../src/state/session";
import { useI18n } from "../../src/i18n";
import { colors, fonts } from "../../src/theme";

export default function AppLayout() {
  const { ready, user } = useSession();
  const { t, lang } = useI18n();
  if (ready && !user) return <Redirect href="/(auth)/login" />;
  const label = lang === "hi" ? fonts.hindiStrong : fonts.bodyStrong;
  return (
    <BusinessProvider>
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
      <Tabs.Screen name="shop" options={{ title: t.shop }} />
      <Tabs.Screen name="orders" options={{ title: t.orders }} />
      <Tabs.Screen name="more" options={{ title: t.more }} />
      <Tabs.Screen name="business-new" options={{ href: null, title: t.addBusiness }} />
      <Tabs.Screen name="business-edit" options={{ href: null, title: t.businesses }} />
    </Tabs>
    </BusinessProvider>
  );
}
