jest.mock("lucide-react-native", () => {
  const React = require("react");
  const { View } = require("react-native");
  const Icon = (props) => React.createElement(View, props);
  return new Proxy(
    { __esModule: true },
    {
      get(target, prop) {
        if (prop === "__esModule") return true;
        if (prop in target) return target[prop];
        return Icon;
      }
    }
  );
});

jest.mock("react-native-worklets", () => ({}));

jest.mock("react-native-reanimated", () => {
  const { View, Text, Image, ScrollView } = require("react-native");
  return {
    __esModule: true,
    default: { View, Text, Image, ScrollView, call: () => {} },
    View,
    Text,
    Image,
    ScrollView,
    useSharedValue: (value) => ({ value }),
    useAnimatedStyle: (factory) => factory(),
    useAnimatedProps: () => ({}),
    withTiming: (value) => value,
    withSpring: (value) => value,
    withRepeat: (value) => value,
    withSequence: (...values) => values[0],
    withDelay: (_delay, value) => value,
    Easing: { out: (fn) => fn, cubic: (t) => t, linear: (t) => t, in: (fn) => fn, inOut: (fn) => fn },
    runOnJS: (fn) => fn,
    createAnimatedComponent: (component) => component
  };
});

jest.mock("react-native-gesture-handler", () => {
  const React = require("react");
  const { View } = require("react-native");
  const chain = () => {
    const gesture = {
      activeOffsetX: () => gesture,
      failOffsetY: () => gesture,
      onUpdate: () => gesture,
      onEnd: () => gesture
    };
    return gesture;
  };
  return {
    GestureHandlerRootView: View,
    GestureDetector: ({ children }) => React.createElement(View, null, children),
    Gesture: { Pan: chain }
  };
});

jest.mock("expo-haptics", () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: "light", Medium: "medium", Heavy: "heavy" },
  NotificationFeedbackType: { Success: "success", Error: "error", Warning: "warning" }
}));

jest.mock("expo-linear-gradient", () => {
  const React = require("react");
  const { View } = require("react-native");
  return {
    LinearGradient: ({ children, ...props }) => React.createElement(View, props, children)
  };
});

jest.mock("expo-device", () => ({ totalMemory: 4 * 1024 * 1024 * 1024 }));
