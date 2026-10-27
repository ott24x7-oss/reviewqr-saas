import { render, screen } from "@testing-library/react-native";
import { StyleSheet } from "react-native";
import type { Palette } from "../src/ui/tokens";
import { PhotoSourceButtons } from "../src/ui/photo-source-buttons";

const palette = {
  paper: "#fff",
  line: "#ddd",
  deep: "#333",
  ink: "#111",
  card: "#fff",
  primary: "#000",
  onPrimary: "#fff",
  muted: "#666",
  danger: "#f00",
  warning: "#fc0",
  success: "#0a0",
  accentSoft: "#eee",
  inkSoft: "#444"
} as unknown as Palette;

describe("PhotoSourceButtons", () => {
  it("exposes equally sized camera and gallery actions in English and Hindi", () => {
    render(<PhotoSourceButtons lang="en" palette={palette} onCamera={jest.fn()} onGallery={jest.fn()} />);

    const camera = screen.getByRole("button", { name: "Take photo · फ़ोटो लें" });
    const gallery = screen.getByRole("button", { name: "Choose from gallery · गैलरी से चुनें" });
    const cameraStyle = StyleSheet.flatten(camera.props.style);
    const galleryStyle = StyleSheet.flatten(gallery.props.style);

    expect(camera.props.accessibilityRole).toBe("button");
    expect(gallery.props.accessibilityRole).toBe("button");
    expect(camera.props.accessibilityState?.disabled).toBe(false);
    expect(gallery.props.accessibilityState?.disabled).toBe(false);
    expect(cameraStyle.minHeight).toBe(galleryStyle.minHeight);
    expect(cameraStyle.borderWidth).toBe(galleryStyle.borderWidth);
    expect(cameraStyle.minHeight).toBeGreaterThanOrEqual(88);
  });
});
