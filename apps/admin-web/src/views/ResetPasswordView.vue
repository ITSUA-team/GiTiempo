<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import {
  authGradientPanelClass,
  AuthIntroPanel,
  AuthResetPasswordForm,
  getCounterpartWorkspaceHref,
  getFirebaseAuthErrorMessage,
  StandaloneSplitPage,
} from "@gitiempo/web-shared";

import { appEnv } from "@/config/env";
import { useToasts } from "@/composables/feedback/useToasts";
import { routeNames } from "@/constants/routes";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const { successToast, errorToast } = useToasts();

const inlineErrorMessage = ref<string | null>(null);
const isChecking = ref(true);
const isSubmitting = ref(false);
const verifiedEmail = ref<string | null>(null);

const userWorkspaceHref = getCounterpartWorkspaceHref({
  configuredUrl: appEnv.userAppUrl,
  fallbackPath: "/login",
});
const introBadgeItems = [
  "Firebase action-code recovery",
  "Password never reaches GiTiempo",
];
const introFeatureCards = [
  {
    title: "Secure action-code link",
    description:
      "The reset link is verified with Firebase before the password form can be used.",
  },
  {
    title: "Same workspace identity",
    description:
      "Set the Firebase password for your workspace account and sign in anywhere in GiTiempo.",
  },
];

const oobCode = computed(() => {
  const code = route.query.oobCode;

  return typeof code === "string" ? code.trim() : "";
});
const resetMode = computed(() => route.query.mode);
const panelState = computed<"checking" | "form" | "invalid">(() => {
  if (isChecking.value) {
    return "checking";
  }

  if (verifiedEmail.value) {
    return "form";
  }

  return "invalid";
});

onMounted(() => {
  void verifyLink();
});

async function verifyLink(): Promise<void> {
  inlineErrorMessage.value = null;
  verifiedEmail.value = null;
  isChecking.value = true;

  // Malformed or foreign action links go straight to the invalid panel with no
  // Firebase call and no toast, matching the invite password-setup precedent.
  if (resetMode.value !== "resetPassword" || !oobCode.value) {
    isChecking.value = false;
    return;
  }

  try {
    verifiedEmail.value = await authStore.verifyPasswordResetCode(
      oobCode.value,
    );
  } catch (error) {
    errorToast(
      getFirebaseAuthErrorMessage(
        error,
        "This password reset link is invalid, expired, or already used.",
      ),
      {
        error,
        logContext: {
          action: "verify-password-reset-link",
          feature: "reset-password",
        },
      },
    );
  } finally {
    isChecking.value = false;
  }
}

function goToForgotPassword(): void {
  void router.push({ name: routeNames.forgotPassword });
}

// Resolver/schema divergence inside the shared form is a client-side problem;
// it stays inline with one neutral copy and never produces a toast.
function handleClientValidationError(): void {
  inlineErrorMessage.value = "Please check the form fields and try again.";
}

async function handleUpdatePassword(newPassword: string): Promise<void> {
  if (!verifiedEmail.value || !oobCode.value) {
    return;
  }

  inlineErrorMessage.value = null;
  isSubmitting.value = true;

  try {
    await authStore.confirmPasswordReset(oobCode.value, newPassword);
    successToast("Password updated. Sign in with your new password.");
    await router.replace({ name: routeNames.login });
  } catch (error) {
    const detail = getFirebaseAuthErrorMessage(
      error,
      "Could not update your password.",
    );
    inlineErrorMessage.value = detail;
    errorToast(detail, {
      error,
      logContext: { action: "confirm-password-reset", feature: "reset-password" },
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div data-testid="reset-password-view">
    <StandaloneSplitPage
      :left-panel-class="authGradientPanelClass"
      left-panel-full-bleed
    >
      <template #left>
        <AuthIntroPanel
          workspace-label="Admin workspace access"
          hero-title="Set a new password and sign back in."
          hero-description="Use the secure reset link from your email to choose a new Firebase password. GiTiempo never receives or stores this password."
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
          <div
            v-if="panelState === 'checking'"
            class="flex flex-col gap-1.5"
          >
            <p class="text-text-dark text-4xl font-bold">
              Checking reset link...
            </p>
            <p class="text-text-muted text-sm leading-6">
              We are validating your Firebase action code before showing the
              password form.
            </p>
          </div>

          <section
            v-else-if="panelState === 'form'"
            class="flex w-full max-w-full flex-col gap-4"
          >
            <div
              class="bg-accent-tint text-brand flex items-center gap-2.5 rounded-sm px-3 py-3 text-[13px] font-medium"
              data-testid="reset-password-verified-email"
            >
              <span aria-hidden="true">@</span>
              <span>
                Reset link verified for {{ verifiedEmail }}
              </span>
            </div>

            <AuthResetPasswordForm
              :error-message="inlineErrorMessage"
              :is-submitting="isSubmitting"
              @submitted="handleUpdatePassword"
              @error="handleClientValidationError"
            />

            <Button
              v-if="inlineErrorMessage"
              label="Back to forgot password"
              class="h-11 w-full"
              data-testid="reset-password-back-to-forgot"
              @click="goToForgotPassword"
            />
          </section>

          <section
            v-else
            class="bg-surface-primary shadow-card flex w-full max-w-full flex-col gap-4 rounded-lg p-6"
            data-testid="reset-password-invalid-panel"
          >
            <div class="flex flex-col gap-1.5">
              <p class="text-text-dark text-4xl font-bold">
                Reset link not usable
              </p>
              <p class="text-text-muted text-sm leading-6">
                This password reset link is invalid, expired, or already used.
                Request a fresh link if you still need to change your password.
              </p>
            </div>

            <Button
              label="Back to forgot password"
              class="h-11 w-full"
              data-testid="reset-password-back-to-forgot"
              @click="goToForgotPassword"
            />
          </section>
        </section>
      </template>
    </StandaloneSplitPage>
  </div>
</template>