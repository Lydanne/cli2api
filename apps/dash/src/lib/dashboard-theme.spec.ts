import { describe, expect, it, vi } from "vitest";
import { isThemeMode, resolveThemeMode, syncDocumentThemeClass, themeModeOptions } from "./dashboard-theme";

describe("dashboard theme", () => {
  it("accepts only supported theme modes", () => {
    expect(isThemeMode("light")).toBe(true);
    expect(isThemeMode("dark")).toBe(true);
    expect(isThemeMode("system")).toBe(true);
    expect(isThemeMode("sepia")).toBe(false);
    expect(themeModeOptions.map((option) => option.value)).toEqual(["system", "light", "dark"]);
  });

  it("resolves system mode from the current media query preference", () => {
    expect(resolveThemeMode("light", true)).toBe("light");
    expect(resolveThemeMode("dark", false)).toBe("dark");
    expect(resolveThemeMode("system", true)).toBe("dark");
    expect(resolveThemeMode("system", false)).toBe("light");
  });

  it("synchronizes the root dark class from the resolved mode", () => {
    const toggle = vi.fn();
    const root = { classList: { toggle } } as unknown as HTMLElement;

    syncDocumentThemeClass(root, "dark");
    syncDocumentThemeClass(root, "light");

    expect(toggle).toHaveBeenNthCalledWith(1, "dark", true);
    expect(toggle).toHaveBeenNthCalledWith(2, "dark", false);
  });
});
