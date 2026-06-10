import { describe, expect, it } from "vitest";
import { createMemoryHistory } from "vue-router";
import { createDashboardRouter, dashboardTabRoutes } from "./router";

describe("dashboard router", () => {
  it("defines dashboard pages for Vue Router navigation", () => {
    const router = createDashboardRouter(createMemoryHistory());

    expect(dashboardTabRoutes.routeBindings).toBe("/route-bindings");
    expect(router.resolve({ name: "routeBindings" }).href).toBe("/route-bindings");
    expect(router.resolve({ name: "accounts" }).href).toBe("/upstream-accounts");
  });
});
