<script setup lang="ts">
import { computed, onMounted, shallowRef, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
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

type SubmitAction = "email" | "google";
type TerminalState = "already-member" | "invalid-link";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const email = shallowRef("");
const password = shallowRef("");
const emailErrorMessage = shallowRef<string | null>(null);
const passwordErrorMessage = shallowRef<string | null>(null);
const inlineErrorMessage = shallowRef<string | null>(null);
const activeAction = shallowRef<SubmitAction | null>(null);
const isRedirecting = shallowRef(false);
const terminalState = shallowRef<TerminalState | null>(null);
const terminalMessage = shallowRef<string | null>(null);
const passwordInputProps: Record<string, string> = {
  "data-testid": "invite-accept-password",
};

const inviteSteps = [
  {
    description: "Use the invited email address so the backend can match the invite.",
    title: "Use invited email",
  },
  {
    description:
      "If this is your first time, set a password from the invite email before signing in.",
    title: "Set password if needed",
  },
  {
    description: "Accept the invite, then continue straight to your dashboard.",
    title: "Continue to dashboard",
  },
] as const;

const inviteToken = computed(() => {
  const token = route.query.token;

  return typeof token === "string" ? token.trim() : "";
});
const isBusy = computed(
  () => activeAction.value !== null || isRedirecting.value || authStore.isSubmitting,
);
const panelState = computed<"already-member" | "form" | "invalid-link">(() => {
  if (terminalState.value) {
    return terminalState.value;
  }

  return inviteToken.value ? "form" : "invalid-link";
});
const invalidLinkCopy = computed(() => {
  if (terminalMessage.value) {
    return `${terminalMessage.value} Return to the login page and request a fresh invite if needed.`;
  }

  return "This invite link is missing or malformed. Return to the login page and request a fresh invite if needed.";
});

watch([email, password], () => {
  emailErrorMessage.value = null;
  passwordErrorMessage.value = null;
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
    // Invite recovery depends on inline guidance, not best-effort provider cleanup.
  }
}

function mapEmailPasswordErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  if (code === "auth/invalid-email") {
    emailErrorMessage.value = "Enter a valid email address.";
    return emailErrorMessage.value;
  }

  if (code === "auth/user-disabled") {
    return "This Firebase account is disabled. Ask an admin for help.";
  }

  if (code === "auth/too-many-requests") {
    return "Too many attempts. Wait a moment, then try again.";
  }

  if (code === "auth/user-not-found") {
    return "No Firebase password is set for this invited email yet. Use the password setup link from the invite email or ask an admin to resend the invite.";
  }

  if (
    code === "auth/invalid-credential" ||
    code === "auth/invalid-login-credentials" ||
    code === "auth/wrong-password"
  ) {
    return "Could not sign in with that email and password. If you have not set a password yet, use the password setup link from the invite email and try again.";
  }

  return getErrorMessage(error, "Could not authenticate with the invited account.");
}

function mapGoogleErrorMessage(error: unknown): string {
  const code = getFirebaseErrorCode(error);

  if (
    code === "auth/popup-closed-by-user" ||
    code === "auth/cancelled-popup-request"
  ) {
    return "Google sign-in was cancelled. Try again when you are ready.";
  }

  return getErrorMessage(error, "Could not authenticate with Google.");
}

async function handleInviteAcceptanceFailure(error: unknown): Promise<void> {
  const message = getErrorMessage(error, "Could not accept invitation.");

  if (message === "Invite email does not match identity") {
    inlineErrorMessage.value =
      "Invite email does not match identity. Sign out and retry with the invited email account.";
    await signOutIdentityProvider();
    appToast.showErrorToast({
      detail: inlineErrorMessage.value,
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
    terminalMessage.value = message;
    await clearInviteQuery();
    await signOutIdentityProvider();
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
    terminalMessage.value = "Your account already has workspace access. Sign in to continue.";
    await clearInviteQuery();
    await signOutIdentityProvider();
    appToast.showInfoToast(
      "Workspace access already exists",
      terminalMessage.value,
    );
    return;
  }

  inlineErrorMessage.value =
    `Firebase sign-in succeeded, but workspace access was not created yet. ${message}`;
  appToast.showErrorToast({
    detail: inlineErrorMessage.value,
    error,
    logContext: { action: "accept-invite", feature: "invite-accept" },
    summary: "Could not accept invite",
  });
}

async function completeInviteAcceptance(
  firebaseIdToken: string,
  action: SubmitAction,
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
      await signOutIdentityProvider();
      appToast.showErrorToast({
        detail: getErrorMessage(
          error,
          "Workspace access was created, but sign-in could not complete.",
        ),
        error,
        logContext: { action: "create-session", feature: "invite-accept" },
        summary: "Sign-in could not complete",
      });
      return;
    }

    await handleInviteAcceptanceFailure(error);
  } finally {
    activeAction.value = null;
    isRedirecting.value = false;
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
    const message = mapEmailPasswordErrorMessage(error);
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
    const message = mapGoogleErrorMessage(error);
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
            Use the password setup link from your invite email if this is your
            first time, then sign in with the invited email. GiTiempo creates
            workspace access after the invite is accepted.
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

        <div class="flex flex-col gap-1.5 text-xs font-medium">
          <span class="text-text-muted">Invite-only onboarding</span>
          <span class="text-text-muted">Backend-provisioned Firebase account</span>
          <span class="text-brand">
            Need a password setup link? Ask an admin to resend the invite.
          </span>
        </div>
      </section>

      <section
        class="bg-app-bg flex w-full items-center justify-center px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-10 lg:py-10"
      >
        <div class="bg-surface shadow-card flex w-full flex-col gap-3.5 rounded-lg p-5">
          <template v-if="panelState === 'form'">
            <div class="flex flex-col gap-1.5">
              <h2 class="text-text-dark text-[28px] font-semibold">
                Accept invite
              </h2>
              <p class="text-text-muted text-sm leading-6">
                Sign in with the invited email after setting a password from the
                invite email if this is your first time.
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
              @submit.prevent="handleEmailAccept"
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
                  autocomplete="current-password"
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
                  label="Accept invite"
                  class="h-10"
                  :loading="activeAction === 'email' || isRedirecting"
                  :disabled="isBusy"
                  data-testid="invite-accept-submit"
                />

                <p
                  class="text-brand text-center text-xs font-medium"
                  data-testid="invite-accept-password-help"
                >
                  Need a password setup link? Check your invite email or ask an
                  admin to resend the invite.
                </p>

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
                {{ terminalMessage ?? "Your account is already a member of this workspace. Sign in to continue." }}
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
