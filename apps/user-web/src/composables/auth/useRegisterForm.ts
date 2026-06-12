import { computed, reactive, ref } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useToast } from "primevue/usetoast";
import {
  type RegisterRequest,
  type RegistrationErrorCode,
} from "@gitiempo/shared";
import {
  createAppToast,
  getErrorMessage,
} from "@gitiempo/web-shared";
import { normalizeRedirectTargetValue } from "@gitiempo/web-shared/router";

import { routeNames } from "@/router";
import { getAuthRuntime } from "@/services/auth-runtime";
import { useAuthStore } from "@/stores/auth";
import {
  registerFormSchema,
  type RegisterFormValues,
} from "@/validation/register";

export type RegisterFieldName = keyof RegisterFormValues;

export type RegisterFieldErrors = Record<RegisterFieldName, string | null>;

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

  function getRegisterRequest(values: RegisterFormValues): RegisterRequest | null {
    clearSubmissionErrors();

    const formResult = registerFormSchema.safeParse(values);

    if (!formResult.success) {
      inlineErrorMessage.value = "Check the registration details and try again.";
      return null;
    }

    return {
      email: formResult.data.email,
      fullName: formResult.data.fullName,
      ownerAcknowledgement: true,
      password: formResult.data.password,
      workspaceName: formResult.data.workspaceName,
    };
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

  async function handleRegister(values: RegisterFormValues): Promise<void> {
    if (isSubmitting.value) {
      return;
    }

    const request = getRegisterRequest(values);

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
    handleRegister,
    inlineErrorMessage,
    isSubmitting,
  };
}
