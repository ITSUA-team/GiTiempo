<script setup lang="ts">
import { computed, nextTick, onMounted, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { z } from "zod";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import {
  createAppToast,
  emailPasswordSignInSchema,
  getErrorMessage,
} from "@gitiempo/web-shared";

import { routeNames } from "@/router";
import { getAuthRuntime } from "@/services/auth-runtime";
import { getWorkspaceInvitesClient } from "@/services/workspace-invites-client";
import { useAuthStore } from "@/stores/auth";

type AuthMode = "create-account" | "sign-in";
type SubmitAction = "email" | "google";
type TerminalState = "already-member" | "invalid-link";

const createAccountSchema = z
  .object({
    email: z.string().trim().pipe(z.email("Enter a valid email address.")),
    password: z.string().min(6, "Password must be at least 6 characters."),
    confirmPassword: z.string().min(1, "Confirm your password."),
  })
  .superRefine(({ confirmPassword, password }, ctx) => {
    if (password !== confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }
  });

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const authMode = shallowRef<AuthMode>("create-account");
const email = shallowRef("");
const password = shallowRef("");
const confirmPassword = shallowRef("");
const emailErrorMessage = shallowRef<string | null>(null);
const passwordErrorMessage = shallowRef<string | null>(null);
const confirmPasswordErrorMessage = shallowRef<string | null>(null);
const inlineErrorMessage = shallowRef<string | null>(null);
const activeAction = shallowRef<SubmitAction | null>(null);
const isRedirecting = shallowRef(false);
const terminalState = shallowRef<TerminalState | null>(null);
const terminalMessage = shallowRef<string | null>(null);
const passwordInputProps: Record<string, string> = {
  "data-testid": "invite-accept-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  "data-testid": "invite-accept-confirm-password",
};

let suppressFeedbackReset = false;

const inviteSteps = [
  {
    description:
      "Create an account with the invited email, or sign in if the account already exists.",
    title: "Use invited email",
  },
  {
    description:
      "The backend verifies the invite token and email before creating membership.",
    title: "Accept invite",
  },
  {
    description: "Successful acceptance redirects into the user workspace.",
    title: "Continue to dashboard",
  },
] as const;

const inviteToken = computed(() => {
  const token = route.query.token;

  return typeof token === "string" ? token.trim() : "";
});
const isCreateAccountMode = computed(() => authMode.value === "create-account");
const isBusy = computed(
  () => activeAction.value !== null || isRedirecting.value || authStore.isSubmitting,
);
const panelState = computed<"already-member" | "form" | "invalid-link">(() => {
  if (terminalState.value) {
    return terminalState.value;
  }

  return inviteToken.value ? "form" : "invalid-link";
});
const panelTitle = computed(() =>
  isCreateAccountMode.value ? "Create account" : "Accept invite",
);
const panelDescription = computed(() =>
  isCreateAccountMode.value
    ? "Set a password for the invited email to join the workspace."
    : "Authenticate with the invited email to join the workspace.",
);
const primaryActionLabel = computed(() =>
  isCreateAccountMode.value ? "Create account" : "Accept invite",
);
const modeSwitchLabel = computed(() =>
  isCreateAccountMode.value
    ? "Already have an account? Sign in"
    : "Create account instead",
);
const invalidLinkCopy = computed(() => {
  if (terminalMessage.value) {
    return `${terminalMessage.value} Return to the login page and request a fresh invite if needed.`;
  }

  return "This invite link is missing or malformed. Return to the login page and request a fresh invite if needed.";
});

watch([authMode, email, password, confirmPassword], () => {
  if (suppressFeedbackReset) {
    return;
  }

  emailErrorMessage.value = null;
  passwordErrorMessage.value = null;
  confirmPasswordErrorMessage.value = null;
  inlineErrorMessage.value = null;
});

onMounted(() => {
  if (typeof route.query.token === "string" && inviteToken.value.length === 0) {
    void clearInviteQuery();
  }
});

function getFirebaseErrorCode(error: unknown): string | null {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code;
  }

  return null;
}

function goToLogin(): void {
  void router.push({ name: routeNames.login });
}

async function clearInviteQuery(): Promise<void> {
  if (Object.hasOwn(route.query, "token")) {
    await router.replace({ name: routeNames.inviteAccept });
  }
}

function resetFieldErrors(): void {
  emailErrorMessage.value = null;
  passwordErrorMessage.value = null;
  confirmPasswordErrorMessage.value = null;
}

function switchAuthMode(nextMode: AuthMode, clearPasswords = true): void {
  suppressFeedbackReset = true;
  authMode.value = nextMode;
  terminalState.value = null;
  terminalMessage.value = null;
  resetFieldErrors();

  if (clearPasswords) {
    password.value = "";
    confirmPassword.value = "";
  }

  void nextTick(() => {
    suppressFeedbackReset = false;
  });
}

function validateCreateAccount(): boolean {
  resetFieldErrors();

  const parsed = createAccountSchema.safeParse({
    confirmPassword: confirmPassword.value,
    email: email.value,
    password: password.value,
  });

  if (parsed.success) {
    return true;
  }

  for (const issue of parsed.error.issues) {
    if (issue.path[0] === "email") {
      emailErrorMessage.value = issue.message;
    }

    if (issue.path[0] === "password") {
      passwordErrorMessage.value = issue.message;
    }

    if (issue.path[0] === "confirmPassword") {
      confirmPasswordErrorMessage.value = issue.message;
    }
  }

  return false;
}

function validateSignIn(): boolean {
  resetFieldErrors();

  const parsed = emailPasswordSignInSchema.safeParse({
    email: email.value,
    password: password.value,
  });

  if (parsed.success) {
    return true;
  }

  for (const issue of parsed.error.issues) {
    if (issue.path[0] === "email") {
      emailErrorMessage.value = issue.message;
    }

    if (issue.path[0] === "password") {
      passwordErrorMessage.value = issue.message;
    }
  }

  return false;
}

async function signOutIdentityProvider(): Promise<void> {
  try {
    await getAuthRuntime().signOutIdentityProvider();
  } catch {
    // Invite acceptance depends on the API session result, not provider sign-out.
  }
}

async function handleInviteFailure(
  error: unknown,
  { accountCreated = false }: { accountCreated?: boolean } = {},
): Promise<void> {
  const message = getErrorMessage(error, "Could not accept invitation.");

  if (!accountCreated) {
    await signOutIdentityProvider();
  }

  if (message === "Invite email does not match identity") {
    if (accountCreated) {
      switchAuthMode("sign-in");
      inlineErrorMessage.value =
        "The account was created, but the invite email does not match identity. Sign in with the invited account.";
      await signOutIdentityProvider();
    } else {
      inlineErrorMessage.value = message;
    }

    appToast.showErrorToast({
      detail: inlineErrorMessage.value ?? message,
      error,
      logContext: { action: "accept-invite", feature: "invite-accept" },
      summary: "Could not accept invite",
    });
    return;
  }

  if (
    message === "Invite not found" ||
    message === "Invite has expired" ||
    message === "Invite cannot be accepted"
  ) {
    terminalState.value = "invalid-link";
    terminalMessage.value = accountCreated
      ? `${message}. Your account was created, but workspace access was not granted.`
      : message;
    await clearInviteQuery();

    if (accountCreated) {
      await signOutIdentityProvider();
    }

    appToast.showErrorToast({
      detail: terminalMessage.value,
      error,
      logContext: { action: "accept-invite", feature: "invite-accept" },
      summary: "Invite link is not usable",
    });
    return;
  }

  if (message === "User is already a workspace member") {
    terminalState.value = "already-member";
    terminalMessage.value = accountCreated
      ? "Your account already has workspace access. Sign in to continue."
      : null;
    await clearInviteQuery();

    if (accountCreated) {
      await signOutIdentityProvider();
    }

    appToast.showInfoToast(
      "Workspace access already exists",
      terminalMessage.value ?? "Sign in to continue to your dashboard.",
    );
    return;
  }

  if (accountCreated) {
    switchAuthMode("sign-in");
    inlineErrorMessage.value =
      `Your account was created, but workspace access could not be granted yet. ${message}`;
    await signOutIdentityProvider();
  } else {
    inlineErrorMessage.value = message;
  }

  appToast.showErrorToast({
    detail: inlineErrorMessage.value ?? message,
    error,
    logContext: { action: "accept-invite", feature: "invite-accept" },
    summary: "Could not accept invite",
  });
}

async function completeInviteAcceptance(
  firebaseIdToken: string,
  action: SubmitAction,
  { accountCreated = false }: { accountCreated?: boolean } = {},
): Promise<void> {
  activeAction.value = action;
  inlineErrorMessage.value = null;
  terminalState.value = null;
  terminalMessage.value = null;

  let inviteAccepted = false;

  try {
    await getWorkspaceInvitesClient().acceptInvite({
      firebaseIdToken,
      token: inviteToken.value,
    });
    inviteAccepted = true;
    isRedirecting.value = true;
    appToast.showSuccessToast(
      "Invitation accepted",
      "Workspace access created. Redirecting to dashboard.",
    );
    await authStore.loginWithFirebaseToken(firebaseIdToken);
    await router.replace({ name: routeNames.dashboard });
  } catch (error) {
    if (inviteAccepted) {
      terminalState.value = "already-member";
      terminalMessage.value = "Workspace access created. Sign in to continue.";
      await clearInviteQuery();
      appToast.showErrorToast({
        detail: getErrorMessage(
          error,
          "Workspace access was created, but sign-in could not complete.",
        ),
        error,
        logContext: { action: "create-session", feature: "invite-accept" },
        summary: "Sign-in could not complete",
      });
      await signOutIdentityProvider();
      return;
    }

    await handleInviteFailure(error, { accountCreated });
  } finally {
    activeAction.value = null;
    isRedirecting.value = false;
  }
}

function handleAccountCreationError(error: unknown): void {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/email-already-in-use") {
    switchAuthMode("sign-in");
    inlineErrorMessage.value = "An account already exists for this email. Sign in instead.";
    appToast.showInfoToast("Account already exists", inlineErrorMessage.value);
    return;
  }

  if (code === "auth/weak-password") {
    passwordErrorMessage.value = "Password must be at least 6 characters.";
  }

  if (code === "auth/invalid-email") {
    emailErrorMessage.value = "Enter a valid email address.";
  }

  if (code === "auth/too-many-requests") {
    inlineErrorMessage.value = "Too many attempts. Please wait and try again.";
  }

  if (code === "auth/network-request-failed") {
    inlineErrorMessage.value =
      "Could not create account because the network request failed. Please try again.";
  }

  const detail =
    inlineErrorMessage.value ??
    passwordErrorMessage.value ??
    emailErrorMessage.value ??
    getErrorMessage(error, "Could not create account.");

  appToast.showErrorToast({
    detail,
    error,
    logContext: { action: "create-account", feature: "invite-accept" },
    summary: "Could not create account",
  });
}

async function handleCreateAccountAccept(): Promise<void> {
  if (!inviteToken.value || !validateCreateAccount()) {
    return;
  }

  activeAction.value = "email";
  inlineErrorMessage.value = null;
  terminalState.value = null;
  terminalMessage.value = null;

  try {
    const firebaseIdToken = await getAuthRuntime().createAccountWithEmailPassword(
      email.value,
      password.value,
    );
    await completeInviteAcceptance(firebaseIdToken, "email", { accountCreated: true });
  } catch (error) {
    handleAccountCreationError(error);
  } finally {
    if (!isRedirecting.value) {
      activeAction.value = null;
    }
  }
}

async function handleEmailAccept(): Promise<void> {
  if (!inviteToken.value || !validateSignIn()) {
    return;
  }

  activeAction.value = "email";
  inlineErrorMessage.value = null;

  try {
    const firebaseIdToken = await getAuthRuntime().signInWithEmailPassword(
      email.value,
      password.value,
    );
    await completeInviteAcceptance(firebaseIdToken, "email");
  } catch (error) {
    const message = getErrorMessage(
      error,
      "Could not authenticate with the invited account.",
    );
    inlineErrorMessage.value = message;
    appToast.showErrorToast({
      detail: message,
      error,
      logContext: { action: "sign-in", feature: "invite-accept" },
      summary: "Could not sign in",
    });
  } finally {
    if (!isRedirecting.value) {
      activeAction.value = null;
    }
  }
}

async function handlePrimarySubmit(): Promise<void> {
  if (isCreateAccountMode.value) {
    await handleCreateAccountAccept();
    return;
  }

  await handleEmailAccept();
}

async function handleGoogleAccept(): Promise<void> {
  if (!inviteToken.value) {
    return;
  }

  activeAction.value = "google";
  inlineErrorMessage.value = null;

  try {
    const firebaseIdToken = await getAuthRuntime().signInWithGoogle();
    await completeInviteAcceptance(firebaseIdToken, "google");
  } catch (error) {
    const message = getErrorMessage(error, "Could not authenticate with Google.");
    inlineErrorMessage.value = message;
    appToast.showErrorToast({
      detail: message,
      error,
      logContext: { action: "google-sign-in", feature: "invite-accept" },
      summary: "Could not sign in",
    });
  } finally {
    if (!isRedirecting.value) {
      activeAction.value = null;
    }
  }
}
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <section
        class="bg-surface flex flex-1 flex-col justify-between px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
      >
        <div class="flex items-center gap-3">
          <div
            class="bg-accent-tint text-brand flex size-10 items-center justify-center rounded-xl text-sm font-semibold"
          >
            GT
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-text-dark text-lg font-semibold">
              GiTiempo
            </p>
            <p class="text-text-muted text-[13px]">
              Workspace invitation
            </p>
          </div>
        </div>

        <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
          <h1 class="text-text-dark text-[40px] leading-[1.1] font-semibold">
            Join your team workspace.
          </h1>
          <p class="text-text-muted max-w-[34rem] text-base leading-7">
            Create an account with the email address that received the invitation,
            or sign in if you already have one. GiTiempo creates workspace access
            after the invite is accepted.
          </p>

          <div class="flex flex-col gap-2.5">
            <div
              v-for="(step, index) in inviteSteps"
              :key="step.title"
              class="flex items-center gap-2.5"
            >
              <div
                class="bg-accent-tint text-brand flex size-7 items-center justify-center rounded-full text-[13px] font-semibold"
              >
                {{ index + 1 }}
              </div>
              <div class="flex flex-col gap-0.5">
                <p class="text-[15px] font-semibold">
                  {{ step.title }}
                </p>
                <p class="text-text-muted text-[13px]">
                  {{ step.description }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div class="text-text-muted flex flex-wrap gap-4 text-xs font-medium">
          <span>Invite-only onboarding</span>
          <span>Creates Firebase account first</span>
          <button
            type="button"
            class="text-brand text-left transition hover:underline"
            @click="goToLogin"
          >
            Already have an account? Sign in from this invite page.
          </button>
        </div>
      </section>

      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-10 lg:py-10"
      >
        <div class="bg-surface shadow-card flex w-full flex-col gap-3.5 rounded-lg p-5">
          <template v-if="panelState === 'form'">
            <div class="flex flex-col gap-1.5">
              <h2 class="text-text-dark text-[28px] font-semibold">
                {{ panelTitle }}
              </h2>
              <p class="text-text-muted text-sm">
                {{ panelDescription }}
              </p>
            </div>

            <div
              class="bg-accent-tint text-brand flex items-center gap-2.5 rounded-sm px-3 py-3 text-[13px] font-medium"
            >
              <span aria-hidden="true">@</span>
              <span>Invite token detected from the email link.</span>
            </div>

            <form
              class="flex flex-col gap-4"
              @submit.prevent="handlePrimarySubmit"
            >
              <div class="flex flex-col gap-1">
                <label
                  for="invite-accept-email"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Email
                </label>
                <InputText
                  id="invite-accept-email"
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="you@workspace.com"
                  :invalid="!!emailErrorMessage"
                  class="h-[42px] w-full"
                  data-testid="invite-accept-email"
                  fluid
                />
                <Message
                  v-if="emailErrorMessage"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ emailErrorMessage }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="invite-accept-password"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Password
                </label>
                <Password
                  v-model="password"
                  input-id="invite-accept-password"
                  :autocomplete="isCreateAccountMode ? 'new-password' : 'current-password'"
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

              <div
                v-if="isCreateAccountMode"
                class="flex flex-col gap-1"
              >
                <label
                  for="invite-accept-confirm-password"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Confirm password
                </label>
                <Password
                  v-model="confirmPassword"
                  input-id="invite-accept-confirm-password"
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
                data-testid="invite-accept-error"
              >
                {{ inlineErrorMessage }}
              </Message>

              <Message
                v-if="isRedirecting"
                severity="success"
                size="small"
                class="text-sm"
              >
                Workspace access created. Redirecting to dashboard.
              </Message>

              <div class="flex flex-col gap-2 pt-1">
                <Button
                  type="submit"
                  :label="primaryActionLabel"
                  class="h-10"
                  :loading="activeAction === 'email' || isRedirecting"
                  :disabled="isBusy"
                  data-testid="invite-accept-submit"
                />

                <Button
                  type="button"
                  :label="modeSwitchLabel"
                  severity="secondary"
                  variant="outlined"
                  class="h-10"
                  :disabled="isBusy"
                  data-testid="invite-accept-mode-switch"
                  @click="switchAuthMode(isCreateAccountMode ? 'sign-in' : 'create-account')"
                />

                <Button
                  type="button"
                  label="Continue with Google"
                  severity="secondary"
                  variant="outlined"
                  class="h-10"
                  :loading="activeAction === 'google' && !isRedirecting"
                  :disabled="isBusy"
                  data-testid="invite-accept-google"
                  @click="handleGoogleAccept"
                />
              </div>
            </form>
          </template>

          <template v-else-if="panelState === 'already-member'">
            <div class="flex flex-col gap-1.5">
              <h2 class="text-text-dark text-[28px] font-semibold">
                Workspace access already exists
              </h2>
              <p class="text-text-muted text-sm leading-6">
                {{ terminalMessage ?? 'Your account is already a member of this workspace. Sign in to continue.' }}
              </p>
            </div>

            <Button
              label="Sign in"
              class="h-10"
              data-testid="invite-accept-sign-in"
              @click="goToLogin"
            />
          </template>

          <template v-else>
            <div class="flex flex-col gap-1.5">
              <h2 class="text-text-dark text-[28px] font-semibold">
                Invalid invite link
              </h2>
              <p class="text-text-muted text-sm leading-6">
                {{ invalidLinkCopy }}
              </p>
            </div>

            <Button
              label="Go to login"
              class="h-10"
              data-testid="invite-accept-login"
              @click="goToLogin"
            />
          </template>
        </div>
      </section>
    </div>
  </div>
</template>
