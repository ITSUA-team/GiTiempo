<script setup lang="ts">
import { hasAllowedRole } from "@gitiempo/web-shared/router";
import ConfirmDialog from "primevue/confirmdialog";
import Toast from "primevue/toast";
import { onBeforeUnmount, onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";

import { routeNames } from "@/constants/routes";
import { useToasts } from "@/composables/feedback/useToasts";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { errorToast } = useToasts();

async function refreshAuthorizationOnFocus(): Promise<void> {
  const authorizationChanged = await authStore.refreshAuthorizationContext();

  if (!authStore.isAuthenticated && route.matched.some((record) => record.meta.requiresAuth)) {
    await router.replace({ name: routeNames.login });
    return;
  }

  if (authorizationChanged && authStore.accessToken && !authStore.profile) {
    errorToast("Could not refresh your access. Please try again.", {
      logContext: { action: "refresh-authorization", feature: "auth" },
    });
    return;
  }

  if (
    authorizationChanged &&
    !hasAllowedRole(
      route.meta.allowedRoles,
      authStore.profile?.role,
    )
  ) {
    await router.replace({ name: routeNames.forbidden });
  }
}

onMounted(() => {
  window.addEventListener("focus", refreshAuthorizationOnFocus);
});

onBeforeUnmount(() => {
  window.removeEventListener("focus", refreshAuthorizationOnFocus);
});
</script>

<template>
  <Toast
    position="top-right"
    :pt="{
      root: 'w-80',
    }"
  />
  <ConfirmDialog />
  <RouterView />
</template>
