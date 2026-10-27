import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { AdminInboxScreen } from "../src/admin/inbox-screen";

jest.mock("react-native-keyboard-controller", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { KeyboardAwareScrollView: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});

jest.mock("expo-web-browser", () => ({ openBrowserAsync: jest.fn(async () => undefined) }));

jest.mock("expo-router", () => ({
  useLocalSearchParams: () => ({ segment: "agents" }),
  router: { setParams: jest.fn(), push: jest.fn(), back: jest.fn(), replace: jest.fn() }
}));

jest.mock("@tanstack/react-query", () => ({
  useQueryClient: () => ({
    getQueryData: jest.fn(),
    setQueryData: jest.fn(),
    invalidateQueries: jest.fn()
  })
}));

jest.mock("../src/admin/api", () => ({
  adminApi: { inboxAction: jest.fn() },
  useAdminInbox: () => ({
    data: {
      counts: { agents: 2, devices: 1, proofs: 0, payouts: 3, refunds: 0, shop: 0, support: 0, failed: 0 },
      items: []
    },
    isRefetching: false,
    isLoading: false,
    isError: false,
    refetch: jest.fn()
  })
}));

jest.mock("../src/admin/security", () => ({
  useAdminSecurity: () => ({ withStepUp: jest.fn() })
}));

jest.mock("../src/i18n", () => ({
  useI18n: () => ({ lang: "en", t: {}, toggle: () => undefined, choose: () => undefined })
}));

const palette = {
  primary: "#0b6e4f",
  onPrimary: "#ffffff",
  line: "#d9e2dc",
  card: "#ffffff",
  ink: "#10231b",
  muted: "#5c6f66",
  bg: "#f4f7f5",
  surface2: "#e7eeea",
  danger: "#b42318",
  warning: "#b54708",
  success: "#067647",
  accentSoft: "#e5f4ee"
};

jest.mock("../src/ui/theme", () => ({
  useTheme: () => ({ palette })
}));

jest.mock("../src/ui/screen", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { Screen: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});

describe("admin inbox segment chips", () => {
  it("keeps the segment row a fixed-height horizontal chip line", () => {
    const view = render(<AdminInboxScreen />);
    const row = view.getByTestId("admin-inbox-segments");
    expect(row.props.horizontal).toBe(true);
    const content = StyleSheet.flatten(row.props.contentContainerStyle);
    const frame = StyleSheet.flatten(row.props.style);
    expect(content.alignItems).toBe("center");
    expect(content.height).toBe(40);
    expect(frame.height).toBe(40);
    expect(frame.flexGrow).toBe(0);
    expect(view.getByText("Agents · 2")).toBeTruthy();
    expect(view.getByText("Devices · 1")).toBeTruthy();
    expect(view.getByText("Print proofs · 0")).toBeTruthy();
    expect(view.getByText("Payouts due · 3")).toBeTruthy();
  });
});
