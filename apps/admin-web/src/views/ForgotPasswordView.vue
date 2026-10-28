<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import Button from "primevue/button";
import {
  authGradientPanelClass,
  AuthForgotPasswordForm,
  AuthIntroPanel,
  getCounterpartWorkspaceHref,
  getFirebaseAuthErrorMessage,
  StandaloneSplitPage,
} from "@gitiempo/web-shared";

import { appEnv } from "@/config/env";
import { useToasts } from "@/composables/feedback/useToasts";
import { routeNames } from "@/constants/routes";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const router = useRouter();
const { successToast, errorToast } = useToasts();

const inlineErrorMessage = ref<string | null>(null);
const isRequestSent = ref(false);
const isSubmitting = ref(false);

const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const introBadgeItems = [
  "Guest-only admin entry",
  "Firebase action-code recovery",
];
const introFeatureCards = [
  {
    title: "Self-service recovery",
    description:
      "Request a reset link with your workspace email and get back into the admin workspace without contacting support.",
  },
  {
    title: "Firebase-backed security",
    description:
      "The action-code link runs directly with Firebase, and the new password never passes through GiTiempo systems.",
  },
];

// One success copy for every outcome so the page never reveals whether the
// account exists.
const successDetail =
  "If an account exists for the entered email, a password reset link is on its way. Open it to choose a new password, then sign in again.";

function goToLogin(): void {
  void router.push({ name: routeNames.login });
}

// Resolver/schema divergence inside the shared form is a client-side problem;
// it stays inline with one neutral copy and never produces a toast.
function handleClientValidationError(): void {
  inlineErrorMessage.value = "Please check the form fields and try again.";
}

async function handleSubmitted(email: string): Promise<void> {
  inlineErrorMessage.value = null;
  isSubmitting.value = true;

  try {
    await authStore.requestPasswordReset(email);
    isRequestSent.value = true;
    successToast(successDetail);
  } catch (error) {
    const detail = getFirebaseAuthErrorMessage(
      error,
      "Could not send the reset email. Try again in a moment.",
    );
    inlineErrorMessage.value = detail;
    errorToast(detail, {
      error,
      logContext: { action: "send-password-reset", feature: "forgot-password" },
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div data-testid="forgot-password-view">
    <StandaloneSplitPage
      :left-panel-class="authGradientPanelClass"
      left-panel-full-bleed
    >
      <template #left>
        <AuthIntroPanel
          workspace-label="Admin workspace access"
          hero-title="Recover admin access with a secure reset link."
          hero-description="Request a password reset for your workspace email and choose a new Firebase password. GiTiempo never receives or stores your password."
          :feature-cards="introFeatureCards"
          :badge-items="introBadgeItems"
          :counterpart-href="userWorkspaceHref"
          counterpart-label="the user workspace"
          counterpart-prompt="Need time tracking? Open"
          product-tagline="GiTiempo"
        />
      </template>

      <template #right>
        <section
          class="flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:px-12 lg:py-12"
        >
          <AuthForgotPasswordForm
            v-if="!isRequestSent"
            title="Forgot your password?"
            description="Enter your email and we will send you a reset link to sign back into the admin workspace."
            :error-message="inlineErrorMessage"
            :is-submitting="isSubmitting"
            @submitted="handleSubmitted"
            @error="handleClientValidationError"
          />

          <section
            v-else
            class="bg-surface-primary shadow-card flex w-full max-w-full flex-col gap-4 rounded-lg p-6"
            data-testid="forgot-password-success-panel"
          >
            <div class="flex flex-col gap-1.5">
              <p class="text-text-dark text-4xl font-bold">
                Check your email
              </p>
              <p class="text-text-muted text-sm leading-6">
                If an account exists for the address you entered, a password
                reset link is on its way. Open it here to choose a new password,
                then sign in again.
              </p>
            </div>

            <Button
              label="Back to login"
              class="h-11 w-full"
              data-testid="forgot-password-back-to-login"
              @click="goToLogin"
            />
          </section>
        </section>
      </template>
    </StandaloneSplitPage>
  </div>
</template>