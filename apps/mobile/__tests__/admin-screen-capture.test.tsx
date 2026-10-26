import { Platform, Text } from "react-native";
import { act, render } from "@testing-library/react-native";
import * as ScreenCapture from "expo-screen-capture";

type FocusItem = { run: () => void | (() => void); cleanup?: void | (() => void) };
const focusRegistry: FocusItem[] = [];

jest.mock("expo-screen-capture", () => ({
  preventScreenCaptureAsync: jest.fn(async () => undefined),
  allowScreenCaptureAsync: jest.fn(async () => undefined)
}));

jest.mock("expo-router", () => {
  const React = require("react");
  return {
    useFocusEffect: (callback: () => void | (() => void)) => {
      const ref = React.useRef(callback);
      ref.current = callback;
      React.useEffect(() => {
        const item: FocusItem = { run: () => ref.current() };
        focusRegistry.push(item);
        item.cleanup = item.run();
        return () => {
          if (typeof item.cleanup === "function") item.cleanup();
          const index = focusRegistry.indexOf(item);
          if (index >= 0) focusRegistry.splice(index, 1);
        };
      }, []);
    },
    router: { back: jest.fn(), push: jest.fn(), replace: jest.fn(), setParams: jest.fn() },
    useLocalSearchParams: () => ({})
  };
});

jest.mock("react-native-keyboard-controller", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});

jest.mock("../src/admin/api", () => ({
  adminApi: { sendStepUp: jest.fn(), verifyStepUp: jest.fn() },
  isStepUpRequired: () => false
}));

import { useAdminScreenCapture } from "../src/admin/security";

function Probe({ captureKey }: { captureKey: string }) {
  useAdminScreenCapture(captureKey);
  return <Text>probe</Text>;
}

function blurFocused() {
  for (const item of focusRegistry) {
    if (typeof item.cleanup === "function") item.cleanup();
    item.cleanup = undefined;
  }
}

function focusAgain() {
  for (const item of focusRegistry) {
    item.cleanup = item.run();
  }
}

describe("admin screenshot blocking follows focus", () => {
  const originalOs = Platform.OS;

  beforeEach(() => {
    focusRegistry.splice(0, focusRegistry.length);
    jest.mocked(ScreenCapture.preventScreenCaptureAsync).mockClear();
    jest.mocked(ScreenCapture.allowScreenCaptureAsync).mockClear();
    Object.defineProperty(Platform, "OS", { value: originalOs, configurable: true });
  });

  afterAll(() => {
    Object.defineProperty(Platform, "OS", { value: originalOs, configurable: true });
  });

  it("blocks on focus and allows on blur while the screen stays mounted", () => {
    const view = render(<Probe captureKey="admin-money" />);
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledWith("admin-money");
    expect(ScreenCapture.allowScreenCaptureAsync).not.toHaveBeenCalled();

    act(() => { blurFocused(); });
    expect(view.getByText("probe")).toBeTruthy();
    expect(ScreenCapture.allowScreenCaptureAsync).toHaveBeenCalledWith("admin-money");
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(1);

    act(() => { focusAgain(); });
    expect(ScreenCapture.preventScreenCaptureAsync).toHaveBeenCalledTimes(2);
    expect(view.getByText("probe")).toBeTruthy();
  });

  it("does not block screenshots on web", () => {
    Object.defineProperty(Platform, "OS", { value: "web", configurable: true });
    render(<Probe captureKey="admin-whatsapp" />);
    expect(ScreenCapture.preventScreenCaptureAsync).not.toHaveBeenCalled();
    expect(ScreenCapture.allowScreenCaptureAsync).not.toHaveBeenCalled();
  });
});
