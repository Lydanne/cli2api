/** Dashboard theme modes available to operators. */
export type ThemeMode = "system" | "light" | "dark";

/** Resolved visual color schemes used by PrimeVue and dashboard CSS. */
export type ResolvedThemeMode = "light" | "dark";

/** Theme options rendered by dashboard selectors. */
export const themeModeOptions: Array<{ value: ThemeMode }> = [{ value: "system" }, { value: "light" }, { value: "dark" }];

/** Returns whether a string is a supported dashboard theme mode. */
export function isThemeMode(value: string): value is ThemeMode {
  return value === "system" || value === "light" || value === "dark";
}

/** Resolves the operator theme mode into the active light or dark scheme. */
export function resolveThemeMode(mode: ThemeMode, systemPrefersDark: boolean): ResolvedThemeMode {
  if (mode === "system") {
    return systemPrefersDark ? "dark" : "light";
  }
  return mode;
}

/** Synchronizes the root `.dark` class used by PrimeVue and dashboard CSS. */
export function syncDocumentThemeClass(root: HTMLElement, resolvedMode: ResolvedThemeMode): void {
  root.classList.toggle("dark", resolvedMode === "dark");
}
