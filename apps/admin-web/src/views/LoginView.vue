<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  authGradientPanelClass,
  AuthIntroPanel,
  AuthSignInForm,
  ExtensionCallout,
  getExtensionInstallHref,
  resolveGithubSignInError,
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
const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const extensionHref = getExtensionInstallHref(appEnv.extensionInstallUrl);
const introBadgeItems = [
  "Guest-only admin entry",
  "Shared auth direction with user-web",
];
const introFeatureCards = [
  {
    title: "Admin-ready reports",
    description:
      "Review team time, project summaries, and invoice inputs from a single authenticated workspace.",
  },
  {
    title: "Shared workspace auth",
    description:
      "Use the same Firebase-backed workspace identity as the user app, without maintaining a second login model.",
  },
];

const redirectTarget = computed(() => {
  return normalizeRedirectTargetValue(route.query.redirect);
});

onMounted(() => {
  // The backend redirects OAuth failures to /login?githubError=<code>; decode it
  // into a message and clear the param so a refresh or back-nav does not re-show it.
  const message = resolveGithubSignInError(route.query.githubError);
  if (message === null) return;
  errorMessage.value = message;
  void router.replace({ query: { ...route.query, githubError: undefined } });
});

async function navigateAfterLogin(): Promise<void> {
  await router.replace(redirectTarget.value ?? { name: routeNames.dashboard });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong while signing in.";
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
    errorMessage.value = getErrorMessage(error);
  }
}

async function handleGoogleSignIn(): Promise<void> {
  errorMessage.value = null;

  try {
    await authStore.loginWithGoogle();
    await navigateAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

function handleGithubSignIn(): void {
  // Backend-driven GitHub sign-in: leave the SPA and let the API run the OAuth
  // flow; it redirects back to /auth/github/callback with a one-time code. Carry
  // the normalized protected-route target so the callback can return the user
  // where they were headed (email/Google `?redirect=` parity).
  const base = appEnv.apiBaseUrl ?? window.location.origin;
  const startUrl = new URL("/auth/github/start", base);
  startUrl.searchParams.set("app", "admin");
  const target = redirectTarget.value;
  if (target !== null) startUrl.searchParams.set("redirect", target);
  window.location.href = startUrl.toString();
}
</script>

<template>
  <StandaloneSplitPage
    :left-panel-class="authGradientPanelClass"
    left-panel-full-bleed
  >
    <template #left>
      <AuthIntroPanel
        workspace-label="Admin workspace access"
        hero-title="Manage reporting, members, and projects in one workspace."
        hero-description="Sign in with your workspace account to access reports, invoicing, member management, and settings from the admin side of GiTiempo."
        :feature-cards="introFeatureCards"
        :badge-items="introBadgeItems"
        :counterpart-href="userWorkspaceHref"
        counterpart-label="the user workspace"
        counterpart-prompt="Need time tracking? Open"
        product-tagline="GiTiempo"
      >
        <template
          v-if="extensionHref"
          #hero-footer
        >
          <ExtensionCallout :href="extensionHref" />
        </template>
      </AuthIntroPanel>
    </template>

    <template #right>
      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
      >
        <AuthSignInForm
          title="Admin sign in"
          description="Use your workspace account to continue into the admin workspace."
          email-placeholder="admin@workspace.com"
          :error-message="errorMessage"
          :github-enabled="appEnv.githubSignInEnabled"
          :is-submitting="authStore.isSubmitting"
          @submit-credentials="handleEmailSignIn"
          @submit-google="handleGoogleSignIn"
          @submit-github="handleGithubSignIn"
        />
      </section>
    </template>
  </StandaloneSplitPage>
</template>
