import AsyncStorage from "@react-native-async-storage/async-storage";
import type { WidgetTaskHandlerProps } from "react-native-android-widget";
import { parseSnapshot, WIDGET_CACHE_KEY } from "./format";
import { MyQrWidget, TodayWidget } from "./views";

export async function widgetTaskHandler({ widgetInfo, widgetAction, renderWidget }: WidgetTaskHandlerProps) {
  if (widgetAction === "WIDGET_DELETED") return;
  const raw = await AsyncStorage.getItem(WIDGET_CACHE_KEY).catch(() => null);
  const snapshot = parseSnapshot(raw);
  const wide = widgetInfo.width >= 250;
  if (widgetInfo.widgetName === "MyQr") {
    renderWidget(<MyQrWidget />);
    return;
  }
  renderWidget(<TodayWidget snapshot={snapshot} wide={wide} />);
}
