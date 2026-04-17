import { createApp } from "vue";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import { createPinia } from "pinia";
import { createRouter, createWebHistory } from "vue-router";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import App from "./App.vue";
import "./assets/main.css";

const app = createApp(App);

const router = createRouter({
  history: createWebHistory(),
  routes: [],
});

app.use(createPinia());
app.use(router);
app.use(PrimeVue, giTiempoPrimeVueOptions);
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
