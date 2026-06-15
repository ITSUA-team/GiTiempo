<script setup lang="ts">
import { Form, type FormSubmitEvent } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import { RouterLink } from "vue-router";
import Button from "primevue/button";
import Checkbox from "primevue/checkbox";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";

import { routeNames } from "@/router";
import type {
  RegisterFieldErrors,
} from "@/composables/auth/useRegisterForm";
import {
  registerFormInitialValues,
  registerFormSchema,
  type RegisterFormValues,
} from "@/validation/register";

defineProps<{
  fieldErrors: RegisterFieldErrors;
  inlineErrorMessage: string | null;
  isSubmitting: boolean;
}>();

const emit = defineEmits<{
  submit: [payload: RegisterFormValues];
}>();

const passwordInputProps: Record<string, string> = {
  "data-testid": "register-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  "data-testid": "register-confirm-password",
};
const resolver = zodResolver(registerFormSchema);

function getFieldMessage(
  formMessage: string | undefined,
  apiMessage: string | null | undefined,
): string | null {
  return formMessage ?? apiMessage ?? null;
}

function handleSubmit(event: FormSubmitEvent): void {
  if (!event.valid) {
    return;
  }

  emit("submit", event.values as RegisterFormValues);
}
</script>

<template>
  <div
    class="flex flex-col gap-6"
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

    <Form
      v-slot="$form"
      class="flex flex-col gap-4"
      :initial-values="registerFormInitialValues"
      :resolver="resolver"
      @submit="handleSubmit"
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
          name="email"
          type="email"
          autocomplete="email"
          placeholder="you@workspace.com"
          class="h-[42px] w-full"
          :invalid="$form.email?.invalid || !!fieldErrors.email"
          data-testid="register-email"
          fluid
        />
        <Message
          v-if="getFieldMessage($form.email?.error?.message, fieldErrors.email)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.email?.error?.message, fieldErrors.email) }}
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
          name="fullName"
          autocomplete="name"
          placeholder="Alexey Tsukanov"
          class="h-[42px] w-full"
          :invalid="$form.fullName?.invalid || !!fieldErrors.fullName"
          data-testid="register-full-name"
          fluid
        />
        <Message
          v-if="getFieldMessage($form.fullName?.error?.message, fieldErrors.fullName)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.fullName?.error?.message, fieldErrors.fullName) }}
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
          name="workspaceName"
          autocomplete="organization"
          placeholder="Workspace Alpha"
          class="h-[42px] w-full"
          :invalid="$form.workspaceName?.invalid || !!fieldErrors.workspaceName"
          data-testid="register-workspace-name"
          fluid
        />
        <Message
          v-if="getFieldMessage($form.workspaceName?.error?.message, fieldErrors.workspaceName)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.workspaceName?.error?.message, fieldErrors.workspaceName) }}
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
          name="password"
          input-id="register-password"
          autocomplete="new-password"
          placeholder="••••••••••"
          :feedback="false"
          :toggle-mask="false"
          :invalid="$form.password?.invalid || !!fieldErrors.password"
          fluid
          input-class="h-[42px] w-full"
          :input-props="passwordInputProps"
        />
        <Message
          v-if="getFieldMessage($form.password?.error?.message, fieldErrors.password)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.password?.error?.message, fieldErrors.password) }}
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
          name="confirmPassword"
          input-id="register-confirm-password"
          autocomplete="new-password"
          placeholder="••••••••••"
          :feedback="false"
          :toggle-mask="false"
          :invalid="$form.confirmPassword?.invalid || !!fieldErrors.confirmPassword"
          fluid
          input-class="h-[42px] w-full"
          :input-props="confirmPasswordInputProps"
        />
        <Message
          v-if="getFieldMessage($form.confirmPassword?.error?.message, fieldErrors.confirmPassword)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.confirmPassword?.error?.message, fieldErrors.confirmPassword) }}
        </Message>
      </div>

      <div class="flex flex-col gap-1.5">
        <label
          for="register-owner-acknowledgement"
          class="border-divider bg-surface-primary flex items-start gap-3 rounded-lg border px-3 py-2.5"
        >
          <Checkbox
            id="register-owner-acknowledgement"
            name="ownerAcknowledgement"
            binary
            input-id="register-owner-acknowledgement"
            :invalid="$form.ownerAcknowledgement?.invalid || !!fieldErrors.ownerAcknowledgement"
            data-testid="register-owner-acknowledgement"
          />
          <span class="text-text-muted text-[13px] leading-5">
            I agree to receive workspace email and accept the workspace owner responsibility.
          </span>
        </label>
        <Message
          v-if="getFieldMessage($form.ownerAcknowledgement?.error?.message, fieldErrors.ownerAcknowledgement)"
          severity="error"
          size="small"
          variant="simple"
          class="text-xs"
        >
          {{ getFieldMessage($form.ownerAcknowledgement?.error?.message, fieldErrors.ownerAcknowledgement) }}
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
    </Form>
  </div>
</template>
