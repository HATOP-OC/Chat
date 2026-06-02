import colors from "@/constants/colors";
import { useThemeStore } from "@/store/themeStore";

export function useColors() {
  const isDark = useThemeStore((s) => s.isDark);
  const palette = isDark ? colors.dark : colors.light;
  return { ...palette, radius: colors.radius };
}
