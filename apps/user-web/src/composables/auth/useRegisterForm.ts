import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
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
import { normalizeRedirectTargetValue } from "@gitiempo/web-shared/router";
import { z } from "zod";

import { routeNames } from "@/router";
import { getAuthRuntime } from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";

export interface RegisterFormValues {
  confirmPassword: string;
  email: string;
  fullName: string;
  ownerAcknowledgement: boolean;
  password: string;
  workspaceName: string;
}

export type RegisterFieldName = keyof RegisterFormValues;

export type RegisterFieldErrors = Record<RegisterFieldName, string | null>;

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
        code: "custom",
        message: "Passwords do not match.",
        path: ["confirmPassword"],
      });
    }

    if (!values.ownerAcknowledgement) {
      ctx.addIssue({
        code: "custom",
        message: "Accept the workspace owner responsibility to continue.",
        path: ["ownerAcknowledgement"],
      });
    }
  });

function createEmptyFieldErrors(): RegisterFieldErrors {
  return {
    confirmPassword: null,
    email: null,
    fullName: null,
    ownerAcknowledgement: null,
    password: null,
    workspaceName: null,
  };
}

function getRegistrationErrorCode(error: unknown): RegistrationErrorCode | null {
  return error instanceof Error && "code" in error && typeof error.code === "string"
    ? (error.code as RegistrationErrorCode)
    : null;
}

function mapRegistrationErrorMessage(error: unknown): string {
  switch (getRegistrationErrorCode(error)) {
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

export function useRegisterForm() {
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
  const fieldErrors = reactive<RegisterFieldErrors>(createEmptyFieldErrors());
  const inlineErrorMessage = ref<string | null>(null);
  const isSubmitting = ref(false);

  const redirectTarget = computed(() =>
    normalizeRedirectTargetValue(route.query.redirect),
  );

  function clearFieldErrors(): void {
    Object.assign(fieldErrors, createEmptyFieldErrors());
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
      const tokenPair = await getAuthRuntime().registerWorkspaceOwner(request);

      await authStore.establishSessionFromTokenPair(tokenPair);
      await navigateAfterRegistration();
    } catch (error) {
      const code = getRegistrationErrorCode(error);

      inlineErrorMessage.value = mapRegistrationErrorMessage(error);
      focusErrorField(code);
      appToast.showErrorToast({
        detail: inlineErrorMessage.value,
        error,
        logContext: {
          action: "register-workspace",
          feature: "workspace-registration",
        },
        summary: "Could not create workspace",
      });
    } finally {
      isSubmitting.value = false;
    }
  }

  return {
    fieldErrors,
    form,
    handleRegister,
    inlineErrorMessage,
    isSubmitting,
  };
}
