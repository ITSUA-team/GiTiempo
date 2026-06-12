<script setup lang="ts">
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

defineProps<{
  fieldErrors: RegisterFieldErrors;
  inlineErrorMessage: string | null;
  isSubmitting: boolean;
}>();

defineEmits<{
  submit: [];
}>();

const email = defineModel<string>("email", { required: true });
const fullName = defineModel<string>("fullName", { required: true });
const workspaceName = defineModel<string>("workspaceName", { required: true });
const password = defineModel<string>("password", { required: true });
const confirmPassword = defineModel<string>("confirmPassword", { required: true });
const ownerAcknowledgement = defineModel<boolean>("ownerAcknowledgement", {
  required: true,
});

const passwordInputProps: Record<string, string> = {
  "data-testid": "register-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  "data-testid": "register-confirm-password",
};
</script>

<template>
  <div
    class="bg-surface-primary border-divider shadow-card flex w-full max-w-[500px] flex-col gap-6 rounded-lg border p-5 sm:p-6 lg:p-8"
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
      @submit.prevent="$emit('submit')"
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
          v-model="email"
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
          v-model="fullName"
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
          v-model="workspaceName"
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
          v-model="password"
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
          v-model="confirmPassword"
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
            v-model="ownerAcknowledgement"
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
</template>
