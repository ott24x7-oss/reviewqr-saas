import AsyncStorage from "@react-native-async-storage/async-storage";
import { Platform } from "react-native";
import { emptySnapshot, WIDGET_CACHE_KEY, type WidgetSnapshot } from "./format";

export async function writeWidgetSnapshot(snapshot: WidgetSnapshot) {
  await AsyncStorage.setItem(WIDGET_CACHE_KEY, JSON.stringify(snapshot)).catch(() => undefined);
  if (Platform.OS !== "android") return;
  try {
    const widgets = await import("react-native-android-widget");
    const views = await import("./views");
    await widgets.requestWidgetUpdate({
      widgetName: "QR24x7Today",
      renderWidget: (info) => <views.TodayWidget snapshot={snapshot} wide={info.width >= 250} />
    });
    await widgets.requestWidgetUpdate({
      widgetName: "MyQr",
      renderWidget: () => <views.MyQrWidget palette={snapshot.palette} />
    });
  } catch {
    // The native widget module exists only in an Android build.
  }
}

export async function clearWidgetSnapshot() {
  await writeWidgetSnapshot(emptySnapshot());
}
