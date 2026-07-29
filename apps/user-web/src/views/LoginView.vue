<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import { ArrowUpRightIcon, PuzzlePieceIcon } from "@heroicons/vue/24/outline";
import {
  AuthIntroPanel,
  AuthSignInForm,
  getErrorMessage,
  resolveGithubSignInError,
  StandaloneSplitPage,
  type EmailPasswordSignInInput,
} from "@gitiempo/web-shared";
import { normalizeRedirectTargetValue } from "@gitiempo/web-shared/router";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { appEnv } from "@/config/env";
import { getLandingExtensionHref } from "@/config/landing";
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
const extensionHref = getLandingExtensionHref(appEnv.landingUrl);
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
  errorMessage.value = message;
  void router.replace({ query: { ...route.query, githubError: undefined } });
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
      >
        <template
          v-if="extensionHref"
          #hero-footer
        >
          <a
            :href="extensionHref"
            target="_blank"
            rel="noreferrer"
            aria-label="Browser extension: track time right from your browser (opens in a new tab)"
            class="bg-app-bg shadow-card focus-visible:outline-brand flex items-center justify-between gap-3 rounded-lg p-4 transition hover:shadow-md focus-visible:outline-2 focus-visible:outline-offset-2"
            data-testid="login-extension-callout"
          >
            <span class="flex items-center gap-3">
              <span
                class="bg-accent-tint text-brand flex size-8 shrink-0 items-center justify-center rounded-md"
              >
                <PuzzlePieceIcon class="size-4" />
              </span>
              <span class="flex flex-col gap-0.5">
                <span class="text-text-dark text-sm font-semibold">
                  Browser extension
                </span>
                <span class="text-text-muted text-xs leading-5">
                  Track time right from your browser
                </span>
              </span>
            </span>
            <ArrowUpRightIcon class="text-text-muted size-4 shrink-0" />
          </a>
        </template>
      </AuthIntroPanel>
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
