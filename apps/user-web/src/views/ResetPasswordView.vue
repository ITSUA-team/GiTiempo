<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import { useToast } from "primevue/usetoast";
import {
  authGradientPanelClass,
  AuthIntroPanel,
  AuthResetPasswordForm,
  createAppToast,
  getFirebaseAuthErrorMessage,
  StandaloneSplitPage,
} from "@gitiempo/web-shared";
import { getCounterpartWorkspaceHref } from "@gitiempo/web-shared/workspace-link";

import { appEnv } from "@/config/env";
import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const panelState = ref<"checking" | "ready" | "invalid">("checking");
const verifiedEmail = ref<string | null>(null);
const errorMessage = ref<string | null>(null);
const isSubmitting = ref(false);

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

const mode = computed(() => {
  const value = route.query.mode;

  return typeof value === "string" ? value.trim() : "";
});
const oobCode = computed(() => {
  const value = route.query.oobCode;

  return typeof value === "string" ? value.trim() : "";
});
const invalidCopy = computed(() => {
  if (mode.value !== "resetPassword" || !oobCode.value) {
    return "This password reset link is invalid or incomplete. Request a new one to continue.";
  }

  return "This password reset link is invalid, expired, or already used. Request a new one to continue.";
});

onMounted(() => {
  if (mode.value !== "resetPassword" || !oobCode.value) {
    panelState.value = "invalid";
    return;
  }

  void verifyLink();
});

function goToForgotPassword(): void {
  void router.push({ name: routeNames.forgotPassword });
}

// Resolver/schema divergence inside the shared form is a client-side edge;
// it stays inline and never produces a toast.
function handleClientValidationError(): void {
  errorMessage.value = "Please check the form fields and try again.";
}

async function verifyLink(): Promise<void> {
  try {
    // Mirror the invite password-setup precedent: validate the action code and
    // surface the account email before asking for a new password.
    verifiedEmail.value = await authStore.verifyPasswordResetCode(oobCode.value);
    panelState.value = "ready";
  } catch (error) {
    panelState.value = "invalid";
    appToast.showErrorToast({
      detail: getFirebaseAuthErrorMessage(
        error,
        "This password reset link is invalid, expired, or already used. Request a new one to continue.",
      ),
      error,
      logContext: { action: "verify-password-reset-link", feature: "reset-password" },
      summary: "Password reset link is not usable",
    });
  }
}

async function handleResetPassword(newPassword: string): Promise<void> {
  if (!oobCode.value) {
    panelState.value = "invalid";
    return;
  }

  isSubmitting.value = true;
  errorMessage.value = null;

  try {
    await authStore.confirmPasswordReset(oobCode.value, newPassword);
    appToast.showSuccessToast(
      "Password updated",
      "You can now sign in with your new password.",
    );
    await router.replace({ name: routeNames.login });
  } catch (error) {
    errorMessage.value = getFirebaseAuthErrorMessage(error, "Could not update your password.");
    appToast.showErrorToast({
      detail: errorMessage.value,
      error,
      logContext: { action: "confirm-password-reset", feature: "reset-password" },
      summary: "Could not update password",
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
        data-testid="reset-password-view"
      >
        <div
          v-if="panelState === 'checking'"
          class="bg-surface-primary shadow-card flex w-full flex-col gap-1.5 rounded-lg p-6"
        >
          <p class="text-text-dark text-4xl font-bold">
            Checking reset link...
          </p>
          <p class="text-text-muted text-sm leading-6">
            We are validating your Firebase action code before showing the
            password form.
          </p>
        </div>

        <div
          v-else-if="panelState === 'ready'"
          class="flex w-full flex-col gap-4"
        >
          <div
            class="bg-accent-tint text-brand flex items-center gap-2.5 rounded-sm px-3 py-3 text-[13px] font-medium"
            data-testid="reset-password-email-display"
          >
            <span aria-hidden="true">@</span>
            <span>
              Reset link verified for {{ verifiedEmail }}
            </span>
          </div>

          <AuthResetPasswordForm
            :error-message="errorMessage"
            :is-submitting="isSubmitting"
            @submitted="handleResetPassword"
            @error="handleClientValidationError"
          />
        </div>

        <div
          v-else
          class="bg-surface-primary shadow-card flex w-full flex-col gap-4 rounded-lg p-6"
          data-testid="reset-password-invalid-panel"
        >
          <div class="flex flex-col gap-1.5">
            <p class="text-text-dark text-4xl font-bold">
              Reset link is not valid
            </p>
            <p class="text-text-muted text-sm leading-6">
              {{ invalidCopy }}
            </p>
          </div>

          <Button
            type="button"
            label="Back to password recovery"
            class="h-10"
            data-testid="reset-password-back-to-forgot"
            @click="goToForgotPassword"
          />
        </div>
      </section>
    </template>
  </StandaloneSplitPage>
</template>