<script setup lang="ts">
import { computed, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Message from "primevue/message";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import { confirmPasswordReset, verifyPasswordResetCode } from "firebase/auth";
import { createAppToast, getErrorMessage } from "@gitiempo/web-shared";

import { getFirebaseAuth } from "@/lib/firebase";
import { getFirebaseErrorCode } from "@/lib/firebase-errors";
import { routeNames } from "@/router";
import InviteOnboardingShell from "@/components/invite/InviteOnboardingShell.vue";

const route = useRoute();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const newPassword = ref("");
const confirmPassword = ref("");
const passwordErrorMessage = ref<string | null>(null);
const confirmPasswordErrorMessage = ref<string | null>(null);
const inlineErrorMessage = ref<string | null>(null);
const verifiedEmail = ref<string | null>(null);
const isChecking = ref(true);
const isSubmitting = ref(false);
const isSuccess = ref(false);
const passwordInputProps: Record<string, string> = {
  "data-testid": "invite-password-setup-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  "data-testid": "invite-password-setup-confirm-password",
};

const inviteSteps = [
  {
    description: "Open the password setup link from your invite email.",
    title: "Verify setup link",
  },
  {
    description: "Save a Firebase password directly with Firebase, never sent to GiTiempo.",
    title: "Save Firebase password",
  },
  {
    description: "Return to the invite page, sign in, and accept access.",
    title: "Return to invite",
  },
] as const;

const shellFooterLines = [
  "Invite-only onboarding",
  "Firebase action-code password setup",
] as const;

const oobCode = computed(() => {
  const code = route.query.oobCode;

  return typeof code === "string" ? code.trim() : "";
});
const continueUrl = computed(() => {
  const value = route.query.continueUrl;

  return typeof value === "string" ? value : null;
});
const inviteReturnTarget = computed(() => normalizeInviteReturnTarget(continueUrl.value));
const hasInviteReturnTarget = computed(() => inviteReturnTarget.value !== null);
const panelState = computed<"checking" | "form" | "invalid" | "success">(() => {
  if (isChecking.value) {
    return "checking";
  }

  if (isSuccess.value) {
    return "success";
  }

  if (verifiedEmail.value) {
    return "form";
  }

  return "invalid";
});
const invalidActionLabel = computed(() =>
  hasInviteReturnTarget.value ? "Back to invite" : "Go to login",
);
const successActionLabel = computed(() =>
  hasInviteReturnTarget.value ? "Continue to invite" : "Go to login",
);
const successCopy = computed(() =>
  hasInviteReturnTarget.value
    ? "Password saved. Return to your invite to sign in and accept access."
    : "Password saved. Go to login to sign in and continue.",
);
const invalidCopy = computed(() =>
  hasInviteReturnTarget.value
    ? "This password setup link is invalid, expired, or already used. Return to your invite and ask an admin for a fresh link if needed."
    : "This password setup link is invalid, expired, or already used. Return to login and ask an admin for a fresh invite if needed.",
);

watch([newPassword, confirmPassword], () => {
  passwordErrorMessage.value = null;
  confirmPasswordErrorMessage.value = null;
  inlineErrorMessage.value = null;
});

onMounted(() => {
  void verifyLink();
});

function normalizeInviteReturnTarget(rawContinueUrl: string | null): string | null {
  if (!rawContinueUrl) {
    return null;
  }

  try {
    const currentOrigin =
      typeof window === "undefined" ? "http://localhost" : window.location.origin;
    const parsed = new URL(rawContinueUrl, currentOrigin);

    const inviteToken = parsed.searchParams.get("token")?.trim();

    if (
      parsed.origin !== currentOrigin ||
      parsed.pathname !== "/invites/accept" ||
      !inviteToken
    ) {
      return null;
    }

    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function goToLogin(): void {
  void router.push({ name: routeNames.login });
}

function goToPrimaryDestination(): void {
  if (inviteReturnTarget.value) {
    void router.push(inviteReturnTarget.value);
    return;
  }

  goToLogin();
}

async function verifyLink(): Promise<void> {
  inlineErrorMessage.value = null;
  verifiedEmail.value = null;
  isChecking.value = true;
  isSuccess.value = false;

  if (!oobCode.value) {
    isChecking.value = false;
    return;
  }

  try {
    verifiedEmail.value = await verifyPasswordResetCode(getFirebaseAuth(), oobCode.value);
  } catch (error) {
    appToast.showErrorToast({
      detail: "This password setup link is invalid, expired, or already used.",
      error,
      logContext: { action: "verify-password-setup-link", feature: "invite-password-setup" },
      summary: "Password setup link is not usable",
    });
  } finally {
    isChecking.value = false;
  }
}

function validatePasswordSetup(): boolean {
  passwordErrorMessage.value = null;
  confirmPasswordErrorMessage.value = null;
  inlineErrorMessage.value = null;

  if (!newPassword.value) {
    passwordErrorMessage.value = "Enter a new password.";
  }

  if (!confirmPassword.value) {
    confirmPasswordErrorMessage.value = "Confirm your password.";
  }

  if (passwordErrorMessage.value || confirmPasswordErrorMessage.value) {
    return false;
  }

  if (newPassword.value !== confirmPassword.value) {
    inlineErrorMessage.value = "Passwords do not match.";
    confirmPasswordErrorMessage.value = inlineErrorMessage.value;
    return false;
  }

  return true;
}

function mapPasswordResetErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  if (
    code === "auth/expired-action-code" ||
    code === "auth/invalid-action-code"
  ) {
    return "This password setup link is invalid, expired, or already used. Go back to your invite and ask an admin for a fresh link if needed.";
  }

  if (code === "auth/weak-password") {
    return "Choose a stronger password and try again.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a moment, then try again.";
  }

  if (code === "auth/network-request-failed") {
    return "Network error. Check your connection and try again.";
  }

  return getErrorMessage(error, "Could not save your password.");
}

async function handleSavePassword(): Promise<void> {
  if (!verifiedEmail.value || !oobCode.value || !validatePasswordSetup()) {
    return;
  }

  isSubmitting.value = true;

  try {
    await confirmPasswordReset(getFirebaseAuth(), oobCode.value, newPassword.value);
    isSuccess.value = true;
    newPassword.value = "";
    confirmPassword.value = "";
    appToast.showSuccessToast(
      "Password saved",
      "Return to your invite to sign in and accept access.",
    );
  } catch (error) {
    inlineErrorMessage.value = mapPasswordResetErrorMessage(error);
    appToast.showErrorToast({
      detail: inlineErrorMessage.value,
      error,
      logContext: { action: "confirm-password-reset", feature: "invite-password-setup" },
      summary: "Could not save password",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <InviteOnboardingShell
    eyebrow="Password setup"
    title="Set your invited account password."
    description="Use this app-hosted Firebase password setup page from your invite email, then return to the invite link to sign in and accept workspace access."
    :steps="inviteSteps"
    :footer-lines="shellFooterLines"
    footer-accent="After saving your password, continue to the invite link to sign in."
  >
    <template v-if="panelState === 'checking'">
      <div class="flex flex-col gap-1.5">
        <h2 class="text-text-dark text-[28px] font-semibold">
          Checking password setup link...
        </h2>
        <p class="text-text-muted text-sm leading-6">
          We are validating your Firebase action code before showing the
          password form.
        </p>
      </div>
    </template>

    <template v-else-if="panelState === 'form'">
      <div class="flex flex-col gap-1.5">
        <h2 class="text-text-dark text-[28px] font-semibold">
          Set your password
        </h2>
        <p class="text-text-muted text-sm leading-6">
          Choose a Firebase password for the invited email. GiTiempo never
          receives or stores this password.
        </p>
      </div>

      <div
        class="bg-accent-tint text-brand flex items-center gap-2.5 rounded-sm px-3 py-3 text-[13px] font-medium"
        data-testid="invite-password-setup-email"
      >
        <span aria-hidden="true">@</span>
        <span>
          Password setup link verified for {{ verifiedEmail }}
        </span>
      </div>

      <form
        class="flex flex-col gap-4"
        @submit.prevent="handleSavePassword"
      >
        <div class="flex flex-col gap-1">
          <label
            for="invite-password-setup-password"
            class="text-text-dark text-[13px] font-medium"
          >
            New password
          </label>
          <Password
            v-model="newPassword"
            input-id="invite-password-setup-password"
            autocomplete="new-password"
            placeholder="••••••••••"
            :feedback="false"
            :toggle-mask="false"
            :invalid="!!passwordErrorMessage"
            fluid
            input-class="h-[42px] w-full"
            :input-props="passwordInputProps"
          />
          <Message
            v-if="passwordErrorMessage"
            severity="error"
            size="small"
            variant="simple"
            class="text-xs"
          >
            {{ passwordErrorMessage }}
          </Message>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="invite-password-setup-confirm-password"
            class="text-text-dark text-[13px] font-medium"
          >
            Confirm password
          </label>
          <Password
            v-model="confirmPassword"
            input-id="invite-password-setup-confirm-password"
            autocomplete="new-password"
            placeholder="••••••••••"
            :feedback="false"
            :toggle-mask="false"
            :invalid="!!confirmPasswordErrorMessage"
            fluid
            input-class="h-[42px] w-full"
            :input-props="confirmPasswordInputProps"
          />
          <Message
            v-if="confirmPasswordErrorMessage"
            severity="error"
            size="small"
            variant="simple"
            class="text-xs"
          >
            {{ confirmPasswordErrorMessage }}
          </Message>
        </div>

        <Message
          v-if="inlineErrorMessage"
          severity="error"
          size="small"
          class="text-sm"
          data-testid="invite-password-setup-error"
        >
          {{ inlineErrorMessage }}
        </Message>

        <Button
          type="submit"
          label="Save password"
          class="h-10"
          :loading="isSubmitting"
          :disabled="isSubmitting"
          data-testid="invite-password-setup-submit"
        />
      </form>
    </template>

    <template v-else-if="panelState === 'success'">
      <div class="flex flex-col gap-1.5">
        <h2 class="text-text-dark text-[28px] font-semibold">
          Password saved
        </h2>
        <p class="text-text-muted text-sm leading-6">
          {{ successCopy }}
        </p>
      </div>

      <Button
        :label="successActionLabel"
        class="h-10"
        data-testid="invite-password-setup-success"
        @click="goToPrimaryDestination"
      />
    </template>

    <template v-else>
      <div class="flex flex-col gap-1.5">
        <h2 class="text-text-dark text-[28px] font-semibold">
          Password setup link expired
        </h2>
        <p class="text-text-muted text-sm leading-6">
          {{ invalidCopy }}
        </p>
      </div>

      <Button
        :label="invalidActionLabel"
        class="h-10"
        data-testid="invite-password-setup-invalid"
        @click="goToPrimaryDestination"
      />
    </template>
  </InviteOnboardingShell>
</template>
