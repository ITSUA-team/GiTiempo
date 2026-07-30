<script setup lang="ts">
import { onMounted } from "vue";
import { useRoute, useRouter } from "vue-router";
import { completeGithubSignInCallback } from "@gitiempo/web-shared";
import { normalizeRedirectTargetValue } from "@gitiempo/web-shared/router";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

onMounted(() =>
  completeGithubSignInCallback(
    {
      code: route.query.code,
      githubError: route.query.githubError,
      redirect: route.query.redirect,
    },
    {
      exchange: (code) => authStore.loginWithGithubSession(code),
      // Return the user to their pre-login target (re-validated here, since it
      // originated from the browser), matching the email/Google redirect flow.
      onSuccess: (redirect) =>
        router.replace(
          normalizeRedirectTargetValue(redirect) ?? {
            name: routeNames.dashboard,
          },
        ),
      // Carry the error to the login page so it — not this transient view —
      // shows the message; a bare local error is lost the moment we navigate.
      onError: (githubError) =>
        router.replace({ name: routeNames.login, query: { githubError } }),
    },
  ),
);
</script>

<template>
  <div
    class="bg-app-bg flex min-h-screen w-full items-center justify-center px-6"
    data-testid="github-callback"
  >
    <p class="text-text-muted text-sm">Completing GitHub sign-in…</p>
  </div>
</template>
