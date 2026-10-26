import { Tabs } from "expo-router";
import { useAdminCopy } from "../../../src/admin/copy";
import { AdminTabBar } from "../../../src/admin/components";

export default function AdminTabsLayout() {
  const t = useAdminCopy();
  return (
    <Tabs
      tabBar={(props) => <AdminTabBar state={props.state} descriptors={props.descriptors} />}
      screenOptions={{ headerShown: false, lazy: true, freezeOnBlur: true }}
    >
      <Tabs.Screen name="home" options={{ title: t.home }} />
      <Tabs.Screen name="inbox" options={{ title: t.inbox }} />
      <Tabs.Screen name="search" options={{ title: t.search }} />
      <Tabs.Screen name="money" options={{ title: t.money }} />
      <Tabs.Screen name="more" options={{ title: t.more }} />
    </Tabs>
  );
}
