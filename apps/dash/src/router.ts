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

const routeComponents: Record<DashboardRouteName, NonNullable<RouteRecordRaw["component"]>> = {
  overview: () => import("./pages/OverviewPage.vue"),
  runs: () => import("./pages/RunsPage.vue"),
  keys: () => import("./pages/ApiKeysPage.vue"),
  profiles: () => import("./pages/ProfilesPage.vue"),
  routeBindings: () => import("./pages/RouteBindingsPage.vue"),
  accounts: () => import("./pages/AccountsPage.vue"),
  instances: () => import("./pages/InstancesPage.vue"),
  users: () => import("./pages/UsersPage.vue")
};

const routes: RouteRecordRaw[] = [
  { path: "/", redirect: dashboardTabRoutes.overview },
  ...Object.entries(dashboardTabRoutes).map(([name, path]) => ({
    path,
    name,
    component: routeComponents[name as DashboardRouteName]
  }))
];

/** Creates the Vue Router instance for the dashboard shell. */
export function createDashboardRouter(history: RouterHistory): Router {
  return createRouter({
    history,
    routes
  });
}
