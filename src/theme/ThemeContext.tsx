/**
 * Sporty Pulse Pro — Theme Context
 * Provides light / dark theming across the Expo app.
 * Persists the user's preference to AsyncStorage.
 **/

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import * as SecureStore from "expo-secure-store";

// ─── Token interface ───────────────────────────────────────────────────────────
// Explicit string interface so darkTheme and lightTheme share the same type.
// Using `as const` on both objects made their literal types incompatible.

export interface AppTheme {
  bg: string;
  surface: string;
  surface2: string;
  border: string;
  text: string;
  muted: string;
  muted2: string;
  accent: string;
  accentDim: string;
  void: string;
  raised: string;
  danger: string;
  dangerDim: string;
}

// ─── Token sets ────────────────────────────────────────────────────────────────
// Mirror your globals.css variables exactly.

export const darkTheme: AppTheme = {
  bg: "#0C0E10",
  surface: "#13171A",
  surface2: "#1A1F23",
  border: "rgba(255,255,255,0.07)",
  text: "#F0EDE4",
  muted: "#6B6B62",
  muted2: "#9A9A90",
  accent: "#C8F135",
  accentDim: "rgba(200,241,53,0.10)",
  void: "#0A0A0A",
  raised: "#1E1E1E",
  danger: "#FF6B5E",
  dangerDim: "rgba(255,107,94,0.10)",
};

export const lightTheme: AppTheme = {
  bg: "#F0F2F5",
  surface: "#FFFFFF",
  surface2: "#E8EAED",
  border: "rgba(0,0,0,0.07)",
  text: "#0A0A0A",
  muted: "#7A7A7A",
  muted2: "#5A5A5A",
  accent: "#5C8A00",
  accentDim: "rgba(92,138,0,0.10)",
  void: "#F0F2F5",
  raised: "#E8EAED",
  danger: "#D9483B",
  dangerDim: "rgba(217,72,59,0.08)",
};

export type ThemeMode = "light" | "dark";

// ─── Context ───────────────────────────────────────────────────────────────────

const STORAGE_KEY = "sp_theme_mode";

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  theme: AppTheme;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  mode: "dark",
  isDark: true,
  theme: darkTheme,
  toggleTheme: () => {},
  setMode: () => {},
});

// ─── Provider ──────────────────────────────────────────────────────────────────

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>("dark");
  const [hydrated, setHydrated] = useState(false);

  // Load persisted preference on mount
  useEffect(() => {
    SecureStore.getItemAsync(STORAGE_KEY)
      .then((stored) => {
        if (stored === "light" || stored === "dark") {
          setModeState(stored);
        } else {
          // First launch, no saved preference yet — always default to
          // dark, regardless of the device's system color scheme. The
          // user can still switch to light mode from SettingsScreen at
          // any time, and that choice is what gets persisted here.
          setModeState("dark");
        }
      })
      .catch(() => {
        setModeState("dark");
      })
      .finally(() => setHydrated(true));
  }, []);

  const setMode = useCallback(async (next: ThemeMode) => {
    setModeState(next);
    try {
      await SecureStore.setItemAsync(STORAGE_KEY, next);
    } catch {
      // non-fatal — preference just won't persist this session
    }
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(mode === "dark" ? "light" : "dark");
  }, [mode, setMode]);

  const isDark = mode === "dark";
  const theme: AppTheme = isDark ? darkTheme : lightTheme;

  // Avoid flash of wrong theme before AsyncStorage resolves
  if (!hydrated) return null;

  return (
    <ThemeContext.Provider
      value={{ mode, isDark, theme, toggleTheme, setMode }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

// ─── Hook ──────────────────────────────────────────────────────────────────────

export function useAppTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
