<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import Button from "primevue/button";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";

import {
  emailPasswordSignInSchema,
  type EmailPasswordSignInInput,
} from "../validation/auth";

const props = defineProps<{
  description: string;
  emailPlaceholder: string;
  errorMessage?: string | null;
  isSubmitting: boolean;
  title: string;
}>();

const emit = defineEmits<{
  submitCredentials: [payload: EmailPasswordSignInInput];
  submitGoogle: [];
}>();

const initialValues: EmailPasswordSignInInput = {
  email: "",
  password: "",
};
const passwordInputProps: Record<string, string> = {
  "data-testid": "sign-in-password",
};
const resolver = zodResolver(emailPasswordSignInSchema);

function handleSubmit(event: { valid: boolean; values: Record<string, unknown> }): void {
  if (!event.valid) {
    return;
  }

  const result = emailPasswordSignInSchema.safeParse(event.values);

  if (result.success) {
    emit("submitCredentials", result.data);
  }
}
</script>

<template>
  <div class="w-full rounded-[10px] bg-surface p-6 shadow-card">
    <div class="flex flex-col gap-5">
      <div class="flex flex-col gap-[6px]">
        <p class="text-[28px] font-semibold text-text-dark">
          {{ props.title }}
        </p>
        <p class="text-sm text-text-muted">
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
            for="sign-in-email"
            class="text-[13px] font-medium text-text-dark"
          >
            Email
          </label>
          <InputText
            input-id="sign-in-email"
            name="email"
            type="email"
            autocomplete="email"
            :placeholder="props.emailPlaceholder"
            :invalid="$form.email?.invalid"
            class="h-[42px] w-full"
            data-testid="sign-in-email"
            fluid
          />
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

        <div class="flex flex-col gap-1">
          <label
            for="sign-in-password"
            class="text-[13px] font-medium text-text-dark"
          >
            Password
          </label>
          <Password
            input-id="sign-in-password"
            name="password"
            autocomplete="current-password"
            placeholder="••••••••••"
            :feedback="false"
            :toggle-mask="false"
            :invalid="$form.password?.invalid"
            fluid
            input-class="h-[42px] w-full"
            :input-props="passwordInputProps"
          />
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

        <p
          v-if="props.errorMessage"
          class="rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
          data-testid="sign-in-error"
        >
          {{ props.errorMessage }}
        </p>

        <div class="flex flex-col gap-3 pt-1">
          <Button
            type="submit"
            label="Sign in"
            class="h-11"
            :loading="props.isSubmitting"
            :disabled="props.isSubmitting"
            data-testid="sign-in-submit"
          />

          <Button
            type="button"
            label="Continue with Google"
            severity="secondary"
            variant="outlined"
            class="h-11"
            :disabled="props.isSubmitting"
            data-testid="sign-in-google"
            @click="emit('submitGoogle')"
          />
        </div>
      </Form>

      <p class="text-xs leading-5 text-text-muted">
        By continuing, you agree to your workspace authentication policy.
      </p>
    </div>
  </div>
</template>
