<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import {
  AuthIntroPanel,
  AuthSignInForm,
  getErrorMessage,
  StandaloneSplitPage,
  type EmailPasswordSignInInput,
} from "@gitiempo/web-shared";
import { normalizeRedirectTargetValue } from "@gitiempo/web-shared/router";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const errorMessage = ref<string | null>(null);
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.adminAppUrl,
  fallbackPath: "/login",
});
const introBadgeItems = ["Secure workspace sign-in", "No dark mode for MVP"];
const introFeatureCards = [
  {
    title: "Flexible task tracking",
    description:
      "Attach tracked time to the right task context today, with room for more integrations over time.",
  },
  {
    title: "PM-ready reporting",
    description:
      "Review projects, entries, members, invoices, and settings without leaving one workspace.",
  },
];

const redirectTarget = computed(() => {
  return normalizeRedirectTargetValue(route.query.redirect);
});

async function navigateAfterLogin(): Promise<void> {
  await router.replace(redirectTarget.value ?? { name: routeNames.dashboard });
}

async function handleEmailSignIn({
  email,
  password,
}: EmailPasswordSignInInput): Promise<void> {
  errorMessage.value = null;

  try {
    await authStore.loginWithEmailPassword(email, password);
    await navigateAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      "Something went wrong while signing in.",
    );
  }
}

async function handleGoogleSignIn(): Promise<void> {
  errorMessage.value = null;

  try {
    await authStore.loginWithGoogle();
    await navigateAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(
      error,
      "Something went wrong while signing in.",
    );
  }
}

function handleGithubSignIn(): void {
  // Backend-driven GitHub sign-in: leave the SPA and let the API run the OAuth
  // flow; it redirects back to /auth/github/callback with a one-time code.
  const base = appEnv.apiBaseUrl ?? window.location.origin;
  window.location.href = new URL(
    "/auth/github/start?app=user",
    base,
  ).toString();
}

function goToRegister(): void {
  void router.push({ name: routeNames.register });
}
</script>

<template>
  <StandaloneSplitPage>
    <template #left>
      <AuthIntroPanel
        workspace-label="Time tracking for modern product teams"
        hero-title="Track work where your tasks already live."
        hero-description="Start timers from your tasks and projects in one place. Keep personal tracking simple while giving PMs the reporting they need."
        :feature-cards="introFeatureCards"
        :badge-items="introBadgeItems"
        :counterpart-href="adminWorkspaceHref"
        counterpart-label="the admin workspace"
        counterpart-prompt="Need admin tools? Open"
        product-tagline="GiTiempo"
      />
    </template>

    <template #right>
      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-12 lg:py-12"
      >
        <AuthSignInForm
          title="Sign in"
          description="Use your workspace account to continue into GiTiempo."
          email-placeholder="you@workspace.com"
          :error-message="errorMessage"
          :github-enabled="appEnv.githubSignInEnabled"
          :is-submitting="authStore.isSubmitting"
          @submit-credentials="handleEmailSignIn"
          @submit-google="handleGoogleSignIn"
          @submit-github="handleGithubSignIn"
        >
          <template #secondary-actions>
            <Button
              type="button"
              label="Create workspace"
              severity="secondary"
              variant="outlined"
              class="h-11"
              data-testid="sign-in-create-workspace"
              @click="goToRegister"
            />
          </template>
        </AuthSignInForm>
      </section>
    </template>
  </StandaloneSplitPage>
</template>
