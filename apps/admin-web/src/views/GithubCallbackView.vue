<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { getErrorMessage } from '@gitiempo/web-shared';

import { routeNames } from '@/constants/routes';
import { useAuthStore } from '@/stores/auth';

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const errorMessage = ref<string | null>(null);

const githubErrorMessages: Record<string, string> = {
  denied: 'GitHub sign-in was cancelled.',
  email: 'Your GitHub account has no verified primary email to sign in with.',
  state: 'GitHub sign-in could not be verified. Please try again.',
  failed: 'Something went wrong while signing in with GitHub.',
};

function firstQueryValue(value: unknown): string | null {
  if (Array.isArray(value)) return typeof value[0] === 'string' ? value[0] : null;
  return typeof value === 'string' ? value : null;
}

async function goToLogin(message: string): Promise<void> {
  errorMessage.value = message;
  await router.replace({ name: routeNames.login });
}

onMounted(async () => {
  const githubError = firstQueryValue(route.query.githubError);
  if (githubError) {
    await goToLogin(
      githubErrorMessages[githubError] ?? githubErrorMessages.failed,
    );
    return;
  }

  const code = firstQueryValue(route.query.code);
  if (!code) {
    await goToLogin(githubErrorMessages.failed);
    return;
  }

  try {
    await authStore.loginWithGithubSession(code);
    await router.replace({ name: routeNames.dashboard });
  } catch (error) {
    await goToLogin(
      getErrorMessage(error, 'Could not complete GitHub sign-in.'),
    );
  }
});
</script>

<template>
  <div
    class="bg-app-bg flex min-h-screen w-full items-center justify-center px-6"
    data-testid="github-callback"
  >
    <p class="text-text-muted text-sm">
      {{ errorMessage ?? 'Completing GitHub sign-in…' }}
    </p>
  </div>
</template>
