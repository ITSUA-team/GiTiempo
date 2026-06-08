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

      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-12 lg:py-12"
      >
        <AuthSignInForm
          title="Sign in"
          description="Use your workspace account to continue into GiTiempo."
          email-placeholder="you@workspace.com"
          :error-message="errorMessage"
          :is-submitting="authStore.isSubmitting"
          @submit-credentials="handleEmailSignIn"
          @submit-google="handleGoogleSignIn"
        />
      </section>
    </div>
  </div>
</template>
