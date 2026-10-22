import { useQueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { useEffect, useRef } from "react";
import { apiData } from "../api/data";
import { accountKey } from "../query/keys";
import { useSession } from "../state/session";
import { rememberPushToken } from "./stored-token";
import { routeForPush } from "./routes";

/** Registers this Android device when the owner allows push, and opens the screen a tap names. */
export function PushBridge() {
  const { user } = useSession();
  const client = useQueryClient();
  const openedColdStart = useRef(false);

  useEffect(() => {
    let live = true;
    if (openedColdStart.current) return undefined;
    openedColdStart.current = true;
    (async () => {
      const Notifications = await import("expo-notifications");
      const last = await Notifications.getLastNotificationResponseAsync();
      if (!live || !last) return;
      const data = last.notification.request.content.data as Record<string, unknown>;
      router.push(routeForPush(data));
    })().catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    let remove = () => {};
    let live = true;
    (async () => {
      const Notifications = await import("expo-notifications");
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false
        })
      });
      const sub = Notifications.addNotificationResponseReceivedListener((response) => {
        const data = response.notification.request.content.data as Record<string, unknown>;
        if (data?.type === "plan_active") {
          client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "subscription") }).catch(() => undefined);
        }
        router.push(routeForPush(data));
      });
      const received = Notifications.addNotificationReceivedListener((event) => {
        const data = event.request.content.data as Record<string, unknown>;
        const title = event.request.content.title || "";
        if (data?.type === "plan_active" || title === "Your plan is active") {
          client.invalidateQueries({ queryKey: accountKey(user?.id ?? "", "subscription") }).catch(() => undefined);
        }
      });
      remove = () => {
        sub.remove();
        received.remove();
      };
      if (!live || !user?.pushEnabled) return;
      const Device = await import("expo-device");
      if (!Device.isDevice) return;
      const current = await Notifications.getPermissionsAsync();
      const next = current.status === "granted" ? current : await Notifications.requestPermissionsAsync();
      if (next.status !== "granted" || !live) return;
      const projectId = process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
      if (!projectId) return;
      const token = await Notifications.getExpoPushTokenAsync({ projectId });
      await apiData("/api/v1/push-devices", {
        method: "POST",
        body: JSON.stringify({ token: token.data, platform: "ANDROID" })
      });
      await rememberPushToken(token.data);
    })().catch(() => undefined);
    return () => {
      live = false;
      remove();
    };
  }, [user?.id, user?.pushEnabled]);

  return null;
}
