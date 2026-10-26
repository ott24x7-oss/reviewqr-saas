import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Device from "expo-device";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode
} from "react";
import { AccessibilityInfo, Appearance, type ColorSchemeName } from "react-native";
import { apiData } from "../api/data";
import { useSession } from "../state/session";
import {
  APP_THEMES,
  CINEMATIC_ACCENTS,
  getThemePalette,
  type AppThemeName,
  type CinematicAccent,
  type Palette
} from "./tokens";

const APPEARANCE_KEY = "reviewqr.theme";
const APP_THEME_KEY = "reviewqr.appTheme";
const CINEMATIC_ACCENT_KEY = "reviewqr.cinematicAccent";
const LOW_RAM_BYTES = 2.5 * 1024 * 1024 * 1024;

export type SchemeChoice = "system" | "light" | "dark";

type ThemeValue = {
  palette: Palette;
  choice: SchemeChoice;
  scheme: "light" | "dark";
  appTheme: AppThemeName;
  cinematicAccent: CinematicAccent;
  ready: boolean;
  reduceMotion: boolean;
  lowRam: boolean;
  setChoice: (choice: SchemeChoice) => void;
  setAppTheme: (theme: AppThemeName) => void;
  setCinematicAccent: (accent: CinematicAccent) => void;
};

const fallback: ThemeValue = {
  palette: getThemePalette("emerald", "light"),
  choice: "system",
  scheme: "light",
  appTheme: "emerald",
  cinematicAccent: "gold",
  ready: false,
  reduceMotion: false,
  lowRam: false,
  setChoice: () => undefined,
  setAppTheme: () => undefined,
  setCinematicAccent: () => undefined
};

const ThemeContext = createContext<ThemeValue | null>(null);

function resolve(choice: SchemeChoice, system: ColorSchemeName | null): "light" | "dark" {
  if (choice === "light" || choice === "dark") return choice;
  return system === "dark" ? "dark" : "light";
}

function isTheme(value: string | null): value is AppThemeName {
  return APP_THEMES.some((theme) => theme === value);
}

function isAccent(value: string | null): value is CinematicAccent {
  return CINEMATIC_ACCENTS.some((accent) => accent === value);
}

type StoredPreferences = { appTheme: AppThemeName; cinematicAccent: CinematicAccent };

export function ThemeProvider({ children }: { children: ReactNode }) {
  const { ready: sessionReady, user } = useSession();
  const [choice, setChoiceState] = useState<SchemeChoice>("system");
  const [appTheme, setAppThemeState] = useState<AppThemeName>("emerald");
  const [cinematicAccent, setCinematicAccentState] = useState<CinematicAccent>("gold");
  const [system, setSystem] = useState<ColorSchemeName | null>(Appearance.getColorScheme() ?? null);
  const [reduceMotion, setReduceMotion] = useState(false);
  const [ready, setReady] = useState(false);
  const hasStoredTheme = useRef(false);
  const themeTouched = useRef(false);
  const syncedUser = useRef<string | null>(null);
  const [lowRam] = useState(() => {
    const memory = Device.totalMemory;
    return typeof memory === "number" && memory > 0 && memory < LOW_RAM_BYTES;
  });

  useEffect(() => {
    let live = true;
    Promise.all([
      AsyncStorage.getItem(APPEARANCE_KEY),
      AsyncStorage.getItem(APP_THEME_KEY),
      AsyncStorage.getItem(CINEMATIC_ACCENT_KEY)
    ])
      .then(([savedChoice, savedTheme, savedAccent]) => {
        if (!live) return;
        if (savedChoice === "light" || savedChoice === "dark" || savedChoice === "system") setChoiceState(savedChoice);
        if (isTheme(savedTheme)) {
          hasStoredTheme.current = true;
          setAppThemeState(savedTheme);
        }
        if (isAccent(savedAccent)) setCinematicAccentState(savedAccent);
      })
      .catch(() => undefined)
      .finally(() => {
        if (live) setReady(true);
      });

    const appearanceSub = Appearance.addChangeListener(({ colorScheme }) => setSystem(colorScheme));
    AccessibilityInfo.isReduceMotionEnabled().then(setReduceMotion).catch(() => undefined);
    const reduceSub = AccessibilityInfo.addEventListener("reduceMotionChanged", setReduceMotion);
    return () => {
      live = false;
      appearanceSub.remove();
      reduceSub.remove();
    };
  }, []);

  useEffect(() => {
    if (!ready || !sessionReady) return;
    if (!user) {
      syncedUser.current = null;
      return;
    }
    if (syncedUser.current === user.id) return;
    syncedUser.current = user.id;
    apiData<StoredPreferences>("/api/v1/me/preferences")
      .then((remote) => {
        if (themeTouched.current || hasStoredTheme.current) return;
        if (!isTheme(remote.appTheme) || !isAccent(remote.cinematicAccent)) return;
        setAppThemeState(remote.appTheme);
        setCinematicAccentState(remote.cinematicAccent);
        hasStoredTheme.current = true;
        AsyncStorage.multiSet([
          [APP_THEME_KEY, remote.appTheme],
          [CINEMATIC_ACCENT_KEY, remote.cinematicAccent]
        ]).catch(() => undefined);
      })
      .catch(() => undefined);
  }, [ready, sessionReady, user]);

  const persistPreferences = useCallback((next: StoredPreferences) => {
    hasStoredTheme.current = true;
    AsyncStorage.multiSet([
      [APP_THEME_KEY, next.appTheme],
      [CINEMATIC_ACCENT_KEY, next.cinematicAccent]
    ]).catch(() => undefined);
    if (user) {
      apiData("/api/v1/me/preferences", {
        method: "PUT",
        body: JSON.stringify(next)
      }).catch(() => undefined);
    }
  }, [user]);

  const setAppTheme = useCallback((next: AppThemeName) => {
    themeTouched.current = true;
    setAppThemeState(next);
    persistPreferences({ appTheme: next, cinematicAccent });
  }, [cinematicAccent, persistPreferences]);

  const setCinematicAccent = useCallback((next: CinematicAccent) => {
    themeTouched.current = true;
    setCinematicAccentState(next);
    persistPreferences({ appTheme, cinematicAccent: next });
  }, [appTheme, persistPreferences]);

  const setChoice = useCallback((next: SchemeChoice) => {
    setChoiceState(next);
    AsyncStorage.setItem(APPEARANCE_KEY, next).catch(() => undefined);
  }, []);

  const value = useMemo<ThemeValue>(() => {
    const selectedScheme = appTheme === "cinematic" ? "dark" : resolve(choice, system);
    return {
      palette: getThemePalette(appTheme, selectedScheme, cinematicAccent),
      choice,
      scheme: selectedScheme,
      appTheme,
      cinematicAccent,
      ready,
      reduceMotion,
      lowRam,
      setChoice,
      setAppTheme,
      setCinematicAccent
    };
  }, [appTheme, cinematicAccent, choice, system, ready, reduceMotion, lowRam, setChoice, setAppTheme, setCinematicAccent]);

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
