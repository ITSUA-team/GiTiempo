<script setup lang="ts">
import { computed, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import {
  AuthIntroPanel,
  AuthSignInForm,
  type EmailPasswordSignInInput,
} from "@gitiempo/web-shared";
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
  const redirect = route.query.redirect;

  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : null;
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
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
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
      />

      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-12 lg:py-12"
      >
        <AuthSignInForm
          title="Admin sign in"
          description="Use your workspace account to continue into the admin workspace."
          email-placeholder="admin@workspace.com"
          :error-message="errorMessage"
          :is-submitting="authStore.isSubmitting"
          @submit-credentials="handleEmailSignIn"
          @submit-google="handleGoogleSignIn"
        />
      </section>
    </div>
  </div>
</template>
