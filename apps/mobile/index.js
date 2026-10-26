import "expo-router/entry";
import { Platform } from "react-native";

if (Platform.OS === "android") {
  try {
    const { registerWidgetTaskHandler } = require("react-native-android-widget");
    const { widgetTaskHandler } = require("./src/widgets/task");
    registerWidgetTaskHandler(widgetTaskHandler);
  } catch {
    // Missing until the Android native build includes the widget module.
  }
}
