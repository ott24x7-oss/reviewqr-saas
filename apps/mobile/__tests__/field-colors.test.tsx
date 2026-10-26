import { StyleSheet } from "react-native";
import { render } from "@testing-library/react-native";
import { I18nProvider } from "../src/i18n";
import { Field } from "../src/ui/controls";
import { getThemePalette } from "../src/ui/tokens";

jest.mock("react-native-keyboard-controller", () => {
  const React = require("react");
  const { View } = require("react-native");
  return { KeyboardStickyView: ({ children }: { children: React.ReactNode }) => React.createElement(View, null, children) };
});

jest.mock("../src/ui/theme", () => {
  const { getThemePalette: palette } = jest.requireActual("../src/ui/tokens");
  const value = { palette: palette("cinematic", "dark"), reduceMotion: true };
  return { useTheme: () => value, usePalette: () => value.palette };
});

describe("Field colors", () => {
  it("keeps the palette text and placeholder colors when a screen passes its own style", () => {
    const palette = getThemePalette("cinematic", "dark");
    const view = render(
      <I18nProvider>
        <Field label="Message" value="Hello" placeholder="Type" multiline style={{ minHeight: 112, color: "#000000" }} />
      </I18nProvider>
    );
    const input = view.getByLabelText("Message");
    const style = StyleSheet.flatten(input.props.style);
    expect(style.color).toBe(palette.text);
    expect(style.minHeight).toBe(112);
    expect(input.props.placeholderTextColor).toBe(palette.muted);
  });
});
