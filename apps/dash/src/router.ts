import { createRouter, type RouteRecordRaw, type Router, type RouterHistory } from "vue-router";

/** Dashboard route paths keyed by sidebar page id. */
export const dashboardTabRoutes = {
  overview: "/overview",
  runs: "/runs",
  keys: "/api-keys",
  profiles: "/profiles",
  routeBindings: "/route-bindings",
  accounts: "/upstream-accounts",
  instances: "/instances",
  users: "/users"
} as const;

/** Dashboard route name used by navigation and page selection. */
export type DashboardRouteName = keyof typeof dashboardTabRoutes;

const dashboardRouteView = {
  name: "DashboardRouteView",
  render: () => null
};

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: dashboardTabRoutes.overview },
  ...Object.entries(dashboardTabRoutes).map(([name, path]) => ({
    path,
    name,
    component: dashboardRouteView
  }))
];

/** Creates the Vue Router instance for the dashboard shell. */
export function createDashboardRouter(history: RouterHistory): Router {
  return createRouter({
    history,
    routes
  });
}
