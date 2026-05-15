<script setup lang="ts">
import { RouteErrorPanel } from "@gitiempo/web-shared";
import { hasPriorBrowserHistory } from "@gitiempo/web-shared/browser-history";
import { useRouter } from "vue-router";

import { routeNames } from "@/router";

const router = useRouter();
const showGoBack = hasPriorBrowserHistory();

function goToDashboard(): void {
  void router.push({ name: routeNames.dashboard });
}

function goBack(): void {
  router.back();
}
</script>

<template>
  <RouteErrorPanel
    copy="The page you are looking for may have moved, been deleted, or never existed."
    eyebrow="404"
    icon-glyph="?"
    primary-action-label="Back to dashboard"
    :secondary-action-label="showGoBack ? 'Go back' : undefined"
    title="Page not found"
    @primary-action="goToDashboard"
    @secondary-action="goBack"
  />
</template>
