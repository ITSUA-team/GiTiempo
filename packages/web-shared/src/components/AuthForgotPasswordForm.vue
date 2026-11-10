<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import { EnvelopeIcon } from "@heroicons/vue/24/outline";

import { emailOnlySchema } from "../validation/auth";

const props = withDefaults(
  defineProps<{
    description?: string;
    emailPlaceholder?: string;
    errorMessage?: string | null;
    isSubmitting?: boolean;
    title?: string;
  }>(),
  {
    description: "Enter your email and we will send you a reset link.",
    emailPlaceholder: "alex@example.com",
    errorMessage: null,
    isSubmitting: false,
    title: "Forgot your password?",
  },
);

const emit = defineEmits<{
  submitted: [email: string];
  error: [error: unknown];
}>();

const initialValues = {
  email: "",
};
const resolver = zodResolver(emailOnlySchema);

function handleSubmit(event: { valid: boolean; values: Record<string, unknown> }): void {
  if (!event.valid) {
    return;
  }

  try {
    // parse (not safeParse): a valid-form event that the schema still rejects
    // means the resolver and schema diverged, which is surfaced through the
    // `error` contract instead of being swallowed.
    emit("submitted", emailOnlySchema.parse(event.values).email);
  } catch (error) {
    emit("error", error);
  }
}
</script>

<template>
  <div
    class="bg-surface-primary shadow-card w-full max-w-full rounded-lg p-6"
    data-testid="forgot-password-form"
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
            for="forgot-password-email"
            class="text-text-dark text-[13px] font-medium"
          >
            Email
          </label>
          <div class="relative">
            <EnvelopeIcon
              class="text-text-muted pointer-events-none absolute top-1/2 left-3 size-4.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <InputText
              id="forgot-password-email"
              name="email"
              type="email"
              autocomplete="email"
              :placeholder="props.emailPlaceholder"
              :invalid="$form.email?.invalid"
              class="h-[42px] w-full pl-10"
              data-testid="forgot-password-email"
              fluid
            />
          </div>
          <Message
            v-if="$form.email?.invalid"
            severity="error"
            size="small"
            variant="simple"
            class="text-xs"
          >
            {{ $form.email.error?.message }}
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
            data-testid="forgot-password-error"
          >
            {{ props.errorMessage }}
          </Message>
        </div>

        <button
          type="submit"
          class="focus-visible:outline-brand flex h-11 w-full cursor-pointer items-center justify-center rounded-sm bg-[linear-gradient(135deg,#7a3ea8_0%,#5d2b85_100%)] px-4 text-[15px] font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="props.isSubmitting"
          data-testid="forgot-password-submit"
        >
          Send reset link
        </button>
      </Form>
    </div>
  </div>
</template>