import { createApp } from "vue";
import PrimeVue from "primevue/config";
import ConfirmationService from "primevue/confirmationservice";
import ToastService from "primevue/toastservice";
import { giTiempoPrimeVueOptions } from "@gitiempo/web-config/theme";

import App from "./App.vue";
import "./assets/main.css";
import { router } from "./router";
import { pinia } from "./stores";

const app = createApp(App);

app.use(pinia);
app.use(router);
app.use(PrimeVue, giTiempoPrimeVueOptions);
app.use(ToastService);
app.use(ConfirmationService);

app.mount("#app");
