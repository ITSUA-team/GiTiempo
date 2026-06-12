<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { RouterLink, useRoute, useRouter } from "vue-router";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { useToast } from "primevue/usetoast";
import {
  registerRequestSchema,
  type RegisterRequest,
  type RegistrationErrorCode,
} from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
} from "@gitiempo/web-shared";
import { z } from "zod";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";
import { getWorkspaceRegistrationClient } from "@/services/workspace-registration-client";

interface RegisterFormValues {
  confirmPassword: string;
  email: string;
  fullName: string;
  ownerAcknowledgement: boolean;
  password: string;
  workspaceName: string;
}

type RegisterFieldName = keyof RegisterFormValues;

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();
const toast = useToast();
const appToast = createAppToast(toast);

const form = reactive<RegisterFormValues>({
  confirmPassword: "",
  email: "",
  fullName: "",
  ownerAcknowledgement: false,
  password: "",
  workspaceName: "",
});
const fieldErrors = reactive<Record<RegisterFieldName, string | null>>({
  confirmPassword: null,
  email: null,
  fullName: null,
  ownerAcknowledgement: null,
  password: null,
  workspaceName: null,
});
const inlineErrorMessage = ref<string | null>(null);
const isSubmitting = ref(false);
const passwordInputProps: Record<string, string> = {
  "data-testid": "register-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  "data-testid": "register-confirm-password",
};

const desktopSteps = [
  {
    description: "Create the first owner account for the workspace.",
    title: "Create owner account",
  },
  {
    description: "Choose the workspace name your team will use across the app.",
    title: "Name the workspace",
  },
  {
    description: "Land in the dashboard with a normal signed-in workspace session.",
    title: "Continue to dashboard",
  },
] as const;

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;

  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : null;
});

const registerFormSchema = z
  .object({
    confirmPassword: z.string().min(1, "Confirm your password."),
    email: z.string().trim().min(1, "Enter your work email.").email(
      "Enter a valid work email address.",
    ),
    fullName: z.string().trim().min(1, "Enter your full name."),
    ownerAcknowledgement: z.boolean(),
    password: z.string().min(1, "Enter a password.").min(
      8,
      "Choose a password with at least 8 characters.",
    ),
    workspaceName: z
      .string()
      .trim()
      .min(1, "Enter your workspace name.")
      .max(255, "Workspace name must be 255 characters or fewer."),
  })
  .superRefine((values, ctx) => {
    if (values.password !== values.confirmPassword) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }

    if (!values.ownerAcknowledgement) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Accept the workspace owner responsibility to continue.",
        path: ["ownerAcknowledgement"],
      });
    }
  });

function clearFieldErrors(): void {
  fieldErrors.confirmPassword = null;
  fieldErrors.email = null;
  fieldErrors.fullName = null;
  fieldErrors.ownerAcknowledgement = null;
  fieldErrors.password = null;
  fieldErrors.workspaceName = null;
}

function clearSubmissionErrors(): void {
  inlineErrorMessage.value = null;
  clearFieldErrors();
}

function getRegisterRequest(): RegisterRequest | null {
  clearSubmissionErrors();

  const formResult = registerFormSchema.safeParse(form);

  if (!formResult.success) {
    const flattened = formResult.error.flatten().fieldErrors;

    fieldErrors.confirmPassword = flattened.confirmPassword?.[0] ?? null;
    fieldErrors.email = flattened.email?.[0] ?? null;
    fieldErrors.fullName = flattened.fullName?.[0] ?? null;
    fieldErrors.ownerAcknowledgement =
      flattened.ownerAcknowledgement?.[0] ?? null;
    fieldErrors.password = flattened.password?.[0] ?? null;
    fieldErrors.workspaceName = flattened.workspaceName?.[0] ?? null;

    return null;
  }

  const contractResult = registerRequestSchema.safeParse({
    email: formResult.data.email,
    fullName: formResult.data.fullName,
    ownerAcknowledgement: formResult.data.ownerAcknowledgement,
    password: formResult.data.password,
    workspaceName: formResult.data.workspaceName,
  });

  if (!contractResult.success) {
    inlineErrorMessage.value = "Check the registration details and try again.";
    return null;
  }

  return contractResult.data;
}

function mapRegistrationErrorMessage(error: unknown): string {
  const code =
    error instanceof Error && "code" in error && typeof error.code === "string"
      ? (error.code as RegistrationErrorCode)
      : null;

  switch (code) {
    case "duplicate_email":
      return "This work email is already registered. Sign in instead or use another email.";
    case "invalid_workspace_name":
      return "Enter a valid workspace name.";
    case "rate_limited":
      return "Too many registration attempts. Wait a moment, then try again.";
    case "registration_service_unavailable":
      return "Registration is temporarily unavailable. Try again in a moment.";
    case "weak_password":
      return "Choose a stronger password and try again.";
    case "workspace_name_unavailable":
      return "That workspace name is already in use. Choose another name.";
    default:
      return getErrorMessage(error, "Could not create the workspace.");
  }
}

function focusErrorField(code: RegistrationErrorCode | null): void {
  if (code === "duplicate_email") {
    fieldErrors.email = inlineErrorMessage.value;
  }

  if (
    code === "invalid_workspace_name" ||
    code === "workspace_name_unavailable"
  ) {
    fieldErrors.workspaceName = inlineErrorMessage.value;
  }

  if (code === "weak_password") {
    fieldErrors.password = inlineErrorMessage.value;
  }
}

async function navigateAfterRegistration(): Promise<void> {
  await router.replace(redirectTarget.value ?? { name: routeNames.dashboard });
}

async function handleRegister(): Promise<void> {
  if (isSubmitting.value) {
    return;
  }

  const request = getRegisterRequest();

  if (!request) {
    return;
  }

  isSubmitting.value = true;

  try {
    const tokenPair = await getWorkspaceRegistrationClient().register(request);

    await authStore.establishSessionFromTokenPair(tokenPair);
    await navigateAfterRegistration();
  } catch (error) {
    const code =
      error instanceof Error && "code" in error && typeof error.code === "string"
        ? (error.code as RegistrationErrorCode)
        : null;

    inlineErrorMessage.value = mapRegistrationErrorMessage(error);
    focusErrorField(code);
    appToast.showErrorToast({
      detail: inlineErrorMessage.value,
      error,
      logContext: { action: "register-workspace", feature: "workspace-registration" },
      summary: "Could not create workspace",
    });
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <section
        class="hidden h-auto w-full flex-1 flex-col justify-between bg-[#5D2B85] px-[52px] py-[56px] text-white lg:flex"
        data-testid="register-desktop-intro"
      >
        <div class="flex flex-col gap-8">
          <div class="flex items-center gap-3">
            <div class="flex size-10 items-center justify-center rounded-xl bg-white/14 text-sm font-semibold">
              GT
            </div>
            <div class="flex flex-col gap-0.5">
              <p class="text-[18px] font-semibold">
                GiTiempo
              </p>
              <p class="text-[13px] text-white/80">
                New workspace owner setup
              </p>
            </div>
          </div>

          <div class="flex max-w-[396px] flex-col gap-4">
            <h1 class="text-[40px] leading-[1.1] font-semibold">
              Create the first workspace owner account.
            </h1>
            <p class="text-sm leading-6 text-white/80">
              Register the first owner account, name the workspace, then continue straight into the dashboard.
            </p>
          </div>

          <div class="flex max-w-[396px] flex-col gap-3">
            <article
              v-for="step in desktopSteps"
              :key="step.title"
              class="rounded-lg border border-white/16 bg-white/10 px-4 py-4"
            >
              <div class="flex flex-col gap-1.5">
                <p class="text-sm font-semibold text-white">
                  {{ step.title }}
                </p>
                <p class="text-[13px] leading-6 text-white/78">
                  {{ step.description }}
                </p>
              </div>
            </article>
          </div>
        </div>

        <div class="flex max-w-[396px] flex-col gap-2">
          <p class="text-[13px] font-semibold text-white">
            Owner registration
          </p>
          <p class="text-[13px] leading-6 text-white/72">
            This flow creates the first workspace owner only. Existing members continue to join through invites.
          </p>
        </div>
      </section>

      <section class="bg-app-bg flex w-full flex-1 flex-col">
        <div
          class="flex flex-col gap-[18px] bg-[#5D2B85] px-6 py-7 text-white lg:hidden"
          data-testid="register-mobile-hero"
        >
          <div class="flex items-center gap-2.5">
            <div class="flex size-[34px] items-center justify-center rounded-[9px] bg-white text-sm font-semibold text-[#5D2B85]">
              GT
            </div>
            <p class="text-[15px] font-semibold">
              GiTiempo
            </p>
          </div>
          <div class="flex flex-col gap-3.5">
            <h1 class="text-[28px] leading-[1.12] font-bold">
              Create workspace
            </h1>
            <p class="text-sm leading-6 text-white/82">
              Register the first owner account, then invite the rest of your team.
            </p>
          </div>
        </div>

        <div class="flex w-full flex-1 items-start justify-center px-5 py-6 sm:px-8 sm:py-8 lg:items-center lg:px-12 lg:py-12">
          <div
            class="bg-surface-primary shadow-card flex w-full max-w-[500px] flex-col gap-6 rounded-lg border border-[#EEEEEE] p-5 sm:p-6 lg:p-8"
            data-testid="register-panel"
          >
            <div class="flex flex-col gap-2">
              <h2 class="text-[28px] leading-[1.12] font-bold">
                Create workspace
              </h2>
              <p class="text-text-muted text-sm leading-6">
                Use a work email. This account becomes the initial workspace owner after registration succeeds.
              </p>
            </div>

            <form
              class="flex flex-col gap-4"
              @submit.prevent="handleRegister"
            >
              <div class="flex flex-col gap-1">
                <label
                  for="register-email"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Work email
                </label>
                <InputText
                  id="register-email"
                  v-model="form.email"
                  type="email"
                  autocomplete="email"
                  placeholder="you@workspace.com"
                  class="h-[42px] w-full"
                  :invalid="!!fieldErrors.email"
                  data-testid="register-email"
                  fluid
                />
                <Message
                  v-if="fieldErrors.email"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.email }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="register-full-name"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Full name
                </label>
                <InputText
                  id="register-full-name"
                  v-model="form.fullName"
                  autocomplete="name"
                  placeholder="Alexey Tsukanov"
                  class="h-[42px] w-full"
                  :invalid="!!fieldErrors.fullName"
                  data-testid="register-full-name"
                  fluid
                />
                <Message
                  v-if="fieldErrors.fullName"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.fullName }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="register-workspace-name"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Workspace name
                </label>
                <InputText
                  id="register-workspace-name"
                  v-model="form.workspaceName"
                  autocomplete="organization"
                  placeholder="Workspace Alpha"
                  class="h-[42px] w-full"
                  :invalid="!!fieldErrors.workspaceName"
                  data-testid="register-workspace-name"
                  fluid
                />
                <Message
                  v-if="fieldErrors.workspaceName"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.workspaceName }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="register-password"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Password
                </label>
                <Password
                  v-model="form.password"
                  input-id="register-password"
                  autocomplete="new-password"
                  placeholder="••••••••••"
                  :feedback="false"
                  :toggle-mask="false"
                  :invalid="!!fieldErrors.password"
                  fluid
                  input-class="h-[42px] w-full"
                  :input-props="passwordInputProps"
                />
                <Message
                  v-if="fieldErrors.password"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.password }}
                </Message>
              </div>

              <div class="flex flex-col gap-1">
                <label
                  for="register-confirm-password"
                  class="text-text-dark text-[13px] font-medium"
                >
                  Confirm password
                </label>
                <Password
                  v-model="form.confirmPassword"
                  input-id="register-confirm-password"
                  autocomplete="new-password"
                  placeholder="••••••••••"
                  :feedback="false"
                  :toggle-mask="false"
                  :invalid="!!fieldErrors.confirmPassword"
                  fluid
                  input-class="h-[42px] w-full"
                  :input-props="confirmPasswordInputProps"
                />
                <Message
                  v-if="fieldErrors.confirmPassword"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.confirmPassword }}
                </Message>
              </div>

              <div class="flex flex-col gap-1.5">
                <label
                  for="register-owner-acknowledgement"
                  class="border-divider bg-surface-primary flex items-start gap-3 rounded-lg border px-3 py-2.5"
                >
                  <Checkbox
                    id="register-owner-acknowledgement"
                    v-model="form.ownerAcknowledgement"
                    binary
                    input-id="register-owner-acknowledgement"
                    :invalid="!!fieldErrors.ownerAcknowledgement"
                    data-testid="register-owner-acknowledgement"
                  />
                  <span class="text-text-muted text-[13px] leading-5">
                    I agree to receive workspace email and accept the workspace owner responsibility.
                  </span>
                </label>
                <Message
                  v-if="fieldErrors.ownerAcknowledgement"
                  severity="error"
                  size="small"
                  variant="simple"
                  class="text-xs"
                >
                  {{ fieldErrors.ownerAcknowledgement }}
                </Message>
              </div>

              <p
                v-if="inlineErrorMessage"
                class="border-destructive/20 bg-destructive/5 text-destructive rounded-sm border px-3 py-2 text-sm"
                data-testid="register-inline-error"
              >
                {{ inlineErrorMessage }}
              </p>

              <div class="flex flex-col gap-3 pt-1">
                <Button
                  type="submit"
                  label="Create workspace"
                  class="h-11"
                  :loading="isSubmitting"
                  :disabled="isSubmitting"
                  data-testid="register-submit"
                />

                <div class="flex items-center justify-center gap-1 text-[13px]">
                  <span class="text-text-muted">
                    Already have an account?
                  </span>
                  <RouterLink
                    :to="{ name: routeNames.login }"
                    class="text-brand font-semibold hover:underline"
                    data-testid="register-sign-in-link"
                  >
                    Sign in
                  </RouterLink>
                </div>
              </div>
            </form>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
