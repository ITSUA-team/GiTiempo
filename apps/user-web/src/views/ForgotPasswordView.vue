<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import {
  authGradientPanelClass,
  AuthForgotPasswordForm,
  AuthIntroPanel,
  createAppToast,
  getFirebaseAuthErrorMessage,
  StandaloneSplitPage,
} from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);
const showSuccessPanel = ref(false);

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

function goToLogin(): void {
  void router.push({ name: routeNames.login });
}

// Resolver/schema divergence inside the shared form is a client-side edge;
// it stays inline and never produces a toast.
function handleClientValidationError(): void {
  errorMessage.value = "Please check the form fields and try again.";
}

async function handleSendResetLink(email: string): Promise<void> {
  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    await authStore.requestPasswordReset(email);
    showSuccessPanel.value = true;
    // Firebase resolves for unrecognized emails too, so this copy stays the
    // same for known and unknown accounts (no account enumeration).
    appToast.showSuccessToast(
      "Check your email",
      "If an account exists for that email, a password reset link has been sent.",
    );
  } catch (error) {
    errorMessage.value = getFirebaseAuthErrorMessage(
      error,
      "Could not send the reset link. Try again in a moment.",
    );
    appToast.showErrorToast({
      detail: errorMessage.value,
      error,
      logContext: { action: "send-password-reset", feature: "forgot-password" },
      summary: "Could not send reset link",
    });
  } finally {
    isSubmitting.value = false;
  }
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
      />
    </template>

    <template #right>
      <section
        class="flex w-full flex-col items-center justify-center gap-4 px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
        data-testid="forgot-password-view"
      >
        <AuthForgotPasswordForm
          v-if="!showSuccessPanel"
          :error-message="errorMessage"
          :is-submitting="isSubmitting"
          @submitted="handleSendResetLink"
          @error="handleClientValidationError"
        />

        <div
          v-else
          class="bg-surface-primary shadow-card flex w-full flex-col gap-4 rounded-lg p-6"
          data-testid="forgot-password-success-panel"
        >
          <div class="flex flex-col gap-1.5">
            <p class="text-text-dark text-4xl font-bold">
              Check your email
            </p>
            <p class="text-text-muted text-sm leading-6">
              If an account exists for that email, a password reset link has
              been sent. Follow the link in the email to set a new password.
            </p>
          </div>

          <Button
            type="button"
            label="Back to login"
            class="h-10"
            data-testid="forgot-password-back-to-login"
            @click="goToLogin"
          />
        </div>
      </section>
    </template>
  </StandaloneSplitPage>
</template>