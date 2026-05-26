<script setup lang="ts">
import { RouteErrorPanel } from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";
import { useRouter } from "vue-router";

import { appEnv } from "@/config/env";
import { routeNames } from "@/router";

const router = useRouter();
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});

function goToDashboard(): void {
  void router.push({ name: routeNames.dashboard });
}

function switchWorkspace(): void {
  window.location.assign(userWorkspaceHref);
}
</script>

<template>
  <RouteErrorPanel
    copy="Your current admin role cannot open this page. Switch workspace or return to the dashboard."
    eyebrow="403"
    icon-glyph="!"
    primary-action-label="Back to dashboard"
    secondary-action-label="Switch workspace"
    title="You do not have access"
    @primary-action="goToDashboard"
    @secondary-action="switchWorkspace"
  />
</template>
