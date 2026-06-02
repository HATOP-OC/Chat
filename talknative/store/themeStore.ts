import { Appearance } from "react-native";
import { create } from "zustand";

type ThemeMode = "light" | "dark" | "system";

interface ThemeState {
  mode: ThemeMode;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  toggle: () => void;
}

function getSystemDark() {
  return Appearance.getColorScheme() === "dark";
}

export const useThemeStore = create<ThemeState>((set, get) => {
  Appearance.addChangeListener(({ colorScheme }) => {
    const { mode } = get();
    if (mode === "system") {
      set({ isDark: colorScheme === "dark" });
    }
  });

  return {
    mode: "system",
    isDark: getSystemDark(),
    setMode: (mode) => {
      let isDark =
        mode === "system" ? getSystemDark() : mode === "dark";
      set({ mode, isDark });
    },
    toggle: () => {
      const { isDark } = get();
      set({ mode: isDark ? "light" : "dark", isDark: !isDark });
    },
  };
});
