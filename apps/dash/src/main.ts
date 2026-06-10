import Aura from "@primevue/themes/aura";
import PrimeVue from "primevue/config";
import { createApp } from "vue";
import { createWebHashHistory } from "vue-router";
import App from "./App.vue";
import { createDashboardRouter } from "./router";
import "./style.css";

createApp(App)
  .use(createDashboardRouter(createWebHashHistory()))
  .use(PrimeVue, { theme: { preset: Aura, options: { darkModeSelector: ".dark" } } })
  .mount("#app");
