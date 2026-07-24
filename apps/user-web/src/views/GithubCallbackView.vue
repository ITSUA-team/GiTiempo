<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { completeGithubSignInCallback } from "@gitiempo/web-shared";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const errorMessage = ref<string | null>(null);

onMounted(() =>
  completeGithubSignInCallback(
    { code: route.query.code, githubError: route.query.githubError },
    {
      exchange: (code) => authStore.loginWithGithubSession(code),
      onSuccess: () => router.replace({ name: routeNames.dashboard }),
      onError: async (message) => {
        errorMessage.value = message;
        await router.replace({ name: routeNames.login });
      },
    },
  ),
);
</script>

<template>
  <div
    class="bg-app-bg flex min-h-screen w-full items-center justify-center px-6"
    data-testid="github-callback"
  >
    <p class="text-text-muted text-sm">
      {{ errorMessage ?? "Completing GitHub sign-in…" }}
    </p>
  </div>
</template>
