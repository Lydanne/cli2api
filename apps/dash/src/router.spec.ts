import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createDashboardRouter, dashboardTabRoutes } from "./router";
import { messages } from "./lib/i18n";

describe("dashboard router", () => {
  it("defines dashboard pages for Vue Router navigation", () => {
    const router = createDashboardRouter(createMemoryHistory());

    expect(dashboardTabRoutes.sessions).toBe("/sessions");
    expect(router.resolve({ name: "sessions" }).href).toBe("/sessions");
    expect(router.resolve("/route-bindings").matched[0]?.redirect).toBe("/sessions");
    expect(router.resolve({ name: "accounts" }).href).toBe("/upstream-accounts");
  });

  it("has localized labels for every dashboard route", () => {
    for (const routeName of Object.keys(dashboardTabRoutes)) {
      expect(messages["zh-CN"][routeName as keyof typeof messages["zh-CN"]]).toBeTruthy();
      expect(messages["en-US"][routeName as keyof typeof messages["en-US"]]).toBeTruthy();
    }
  });
});
