import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode
} from "react";
import { AccessibilityInfo, Appearance, type ColorSchemeName } from "react-native";
import { darkPalette, lightPalette, type Palette } from "./tokens";

const THEME_KEY = "reviewqr.theme";
const LOW_RAM_BYTES = 2.5 * 1024 * 1024 * 1024;

export type SchemeChoice = "system" | "light" | "dark";

type ThemeValue = {
  palette: Palette;
  choice: SchemeChoice;
  scheme: "light" | "dark";
  reduceMotion: boolean;
  lowRam: boolean;
  setChoice: (choice: SchemeChoice) => void;
};

const fallback: ThemeValue = {
  palette: lightPalette,
  choice: "system",
  scheme: "light",
  reduceMotion: false,
  lowRam: false,
  setChoice: () => undefined
};

const ThemeContext = createContext<ThemeValue | null>(null);

function resolve(choice: SchemeChoice, system: ColorSchemeName | null): "light" | "dark" {
  if (choice === "light" || choice === "dark") return choice;
  return system === "dark" ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoiceState] = useState<SchemeChoice>("system");
  const [system, setSystem] = useState<ColorSchemeName | null>(Appearance.getColorScheme() ?? null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [lowRam] = useState(() => {
    const memory = Device.totalMemory;
    return typeof memory === "number" && memory > 0 && memory < LOW_RAM_BYTES;
  });

  useEffect(() => {
    AsyncStorage.getItem(THEME_KEY)
      .then((value) => {
        if (value === "light" || value === "dark" || value === "system") setChoiceState(value);
      })
      .catch(() => undefined);
    const sub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      sub.remove();
      reduceSub.remove();
    };
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const scheme = resolve(choice, system);
    return {
      palette: scheme === "dark" ? darkPalette : lightPalette,
      choice,
      scheme,
      reduceMotion,
      lowRam,
      setChoice: (next) => {
        setChoiceState(next);
        AsyncStorage.setItem(THEME_KEY, next).catch(() => undefined);
      }
    };
  }, [choice, system, reduceMotion, lowRam]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  return useContext(ThemeContext) ?? fallback;
}

export function usePalette() {
  return useTheme().palette;
}

export function useStyles<T>(factory: (palette: Palette) => T): T {
  const palette = usePalette();
  return useMemo(() => factory(palette), [palette, factory]);
}
