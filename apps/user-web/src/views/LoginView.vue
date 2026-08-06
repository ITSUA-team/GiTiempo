<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { PlusIcon } from "@heroicons/vue/24/outline";
import {
  AuthDivider,
  authGradientPanelClass,
  AuthIntroPanel,
  AuthSignInForm,
  ExtensionCallout,
  getErrorMessage,
  getExtensionInstallHref,
  resolveGithubSignInError,
  resolveGithubSignInErrorLink,
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
const errorHelpHref = ref<string | null>(null);
const errorHelpLabel = ref<string | null>(null);

function clearSignInError(): void {
  errorMessage.value = null;
  errorHelpHref.value = null;
  errorHelpLabel.value = null;
}
const adminWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.adminAppUrl,
  fallbackPath: "/login",
});
const extensionHref = getExtensionInstallHref(appEnv.extensionInstallUrl);
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

onMounted(() => {
  // The backend redirects OAuth failures to /login?githubError=<code>; decode it
  // into a message and clear the param so a refresh or back-nav does not re-show it.
  const message = resolveGithubSignInError(route.query.githubError);
  if (message === null) return;
  const help = resolveGithubSignInErrorLink(route.query.githubError);
  errorMessage.value = message;
  errorHelpHref.value = help?.href ?? null;
  errorHelpLabel.value = help?.label ?? null;
  void router.replace({ query: { ...route.query, githubError: undefined } });
});

async function navigateAfterLogin(): Promise<void> {
  await router.replace(redirectTarget.value ?? { name: routeNames.dashboard });
}

async function handleEmailSignIn({
  email,
  password,
}: EmailPasswordSignInInput): Promise<void> {
  clearSignInError();

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
  clearSignInError();

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
  // flow; it redirects back to /auth/github/callback with a one-time code. Carry
  // the normalized protected-route target so the callback can return the user
  // where they were headed (email/Google `?redirect=` parity).
  const base = appEnv.apiBaseUrl ?? window.location.origin;
  const startUrl = new URL("/auth/github/start", base);
  startUrl.searchParams.set("app", "user");
  const target = redirectTarget.value;
  if (target !== null) startUrl.searchParams.set("redirect", target);
  window.location.href = startUrl.toString();
}

function goToRegister(): void {
  void router.push({ name: routeNames.register });
}
</script>

<template>
  <StandaloneSplitPage
    :left-panel-class="authGradientPanelClass"
    left-panel-full-bleed
  >
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
          title="Sign in"
          description="Use your workspace account to continue into GiTiempo."
          email-placeholder="you@workspace.com"
          :error-help-href="errorHelpHref"
          :error-help-label="errorHelpLabel"
          :error-message="errorMessage"
          :github-enabled="appEnv.githubSignInEnabled"
          :is-submitting="authStore.isSubmitting"
          @submit-credentials="handleEmailSignIn"
          @submit-google="handleGoogleSignIn"
          @submit-github="handleGithubSignIn"
        >
          <template #secondary-actions>
            <AuthDivider label="New to GiTiempo?" />

            <button
              type="button"
              class="bg-accent-tint border-brand text-brand focus-visible:outline-brand hover:bg-brand/20 flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm border px-4 text-sm font-bold transition focus-visible:outline-2 focus-visible:outline-offset-2"
              data-testid="sign-in-create-workspace"
              @click="goToRegister"
            >
              <PlusIcon class="size-4 shrink-0" />
              Create workspace
            </button>
          </template>
        </AuthSignInForm>
      </section>
    </template>
  </StandaloneSplitPage>
</template>
