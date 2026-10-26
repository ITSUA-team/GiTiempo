<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import Message from "primevue/message";
import Password from "primevue/password";
import { LockClosedIcon } from "@heroicons/vue/24/outline";

import { newPasswordSchema, type NewPasswordInput } from "../validation/auth";

const props = withDefaults(
  defineProps<{
    description?: string;
    errorMessage?: string | null;
    isSubmitting?: boolean;
    submitLabel?: string;
    title?: string;
  }>(),
  {
    description:
      "Choose a new password of at least 8 characters. It is saved directly with Firebase and is never sent to GiTiempo.",
    errorMessage: null,
    isSubmitting: false,
    submitLabel: "Update password",
    title: "Set a new password",
  },
);

const emit = defineEmits<{
  submitted: [newPassword: string];
  error: [error: unknown];
}>();

const initialValues: NewPasswordInput = {
  password: "",
  confirmPassword: "",
};
const passwordInputProps: Record<string, string> = {
  autocomplete: "new-password",
  "data-testid": "reset-password-password",
};
const confirmPasswordInputProps: Record<string, string> = {
  autocomplete: "new-password",
  "data-testid": "reset-password-confirm",
};
const resolver = zodResolver(newPasswordSchema);

function handleSubmit(event: { valid: boolean; values: Record<string, unknown> }): void {
  if (!event.valid) {
    return;
  }

  try {
    // parse (not safeParse): a valid-form event that the schema still rejects
    // means the resolver and schema diverged, which is surfaced through the
    // `error` contract instead of being swallowed.
    emit("submitted", newPasswordSchema.parse(event.values).password);
  } catch (error) {
    emit("error", error);
  }
}
</script>

<template>
  <div
    class="bg-surface-primary shadow-card w-full max-w-full rounded-lg p-6"
    data-testid="reset-password-form"
  >
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-1.5">
        <p class="text-text-dark text-4xl font-bold">
          {{ props.title }}
        </p>
        <p class="text-text-muted text-sm">
          {{ props.description }}
        </p>
      </div>

      <Form
        v-slot="$form"
        class="flex flex-col gap-4"
        :initial-values="initialValues"
        :resolver="resolver"
        @submit="handleSubmit"
      >
        <div class="flex flex-col gap-1">
          <label
            for="reset-password-password"
            class="text-text-dark text-[13px] font-medium"
          >
            New password
          </label>
          <div class="relative">
            <LockClosedIcon
              class="text-text-muted pointer-events-none absolute top-1/2 left-3 z-10 size-4.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Password
              input-id="reset-password-password"
              name="password"
              placeholder="••••••••••"
              :feedback="false"
              toggle-mask
              :invalid="$form.password?.invalid"
              fluid
              input-class="h-[42px] w-full pl-10"
              :input-props="passwordInputProps"
            />
          </div>
          <Message
            v-if="$form.password?.invalid"
            severity="error"
            size="small"
            variant="simple"
            class="text-xs"
          >
            {{ $form.password.error?.message }}
          </Message>
        </div>

        <div class="flex flex-col gap-1">
          <label
            for="reset-password-confirm"
            class="text-text-dark text-[13px] font-medium"
          >
            Confirm password
          </label>
          <div class="relative">
            <LockClosedIcon
              class="text-text-muted pointer-events-none absolute top-1/2 left-3 z-10 size-4.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Password
              input-id="reset-password-confirm"
              name="confirmPassword"
              placeholder="••••••••••"
              :feedback="false"
              toggle-mask
              :invalid="$form.confirmPassword?.invalid"
              fluid
              input-class="h-[42px] w-full pl-10"
              :input-props="confirmPasswordInputProps"
            />
          </div>
          <Message
            v-if="$form.confirmPassword?.invalid"
            severity="error"
            size="small"
            variant="simple"
            class="text-xs"
          >
            {{ $form.confirmPassword.error?.message }}
          </Message>
        </div>

        <div
          v-if="props.errorMessage"
          role="alert"
        >
          <Message
            severity="error"
            size="small"
            class="text-sm"
            data-testid="reset-password-error"
          >
            {{ props.errorMessage }}
          </Message>
        </div>

        <button
          type="submit"
          class="focus-visible:outline-brand flex h-11 w-full cursor-pointer items-center justify-center rounded-sm bg-[linear-gradient(135deg,#7a3ea8_0%,#5d2b85_100%)] px-4 text-[15px] font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isSubmitting"
          data-testid="reset-password-submit"
        >
          {{ props.submitLabel }}
        </button>
      </Form>
    </div>
  </div>
</template>