<script setup lang="ts">
import { Form } from "@primevue/forms";
import { zodResolver } from "@primevue/forms/resolvers/zod";
import InputText from "primevue/inputtext";
import Message from "primevue/message";
import Password from "primevue/password";
import { EnvelopeIcon, LockClosedIcon } from "@heroicons/vue/24/outline";

import AuthDivider from "./AuthDivider.vue";
import GithubMark from "./GithubMark.vue";
import GoogleMark from "./GoogleMark.vue";
import {
  emailPasswordSignInSchema,
  type EmailPasswordSignInInput,
} from "../validation/auth";

const props = withDefaults(
  defineProps<{
    description: string;
    emailPlaceholder: string;
    errorMessage?: string | null;
    githubEnabled?: boolean;
    isSubmitting: boolean;
    title: string;
  }>(),
  { errorMessage: null, githubEnabled: true },
);

const emit = defineEmits<{
  submitCredentials: [payload: EmailPasswordSignInInput];
  submitGoogle: [];
  submitGithub: [];
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
  <div class="bg-surface-primary shadow-card w-full rounded-lg p-6">
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
            for="sign-in-email"
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
              id="sign-in-email"
              name="email"
              type="email"
              autocomplete="email"
              :placeholder="props.emailPlaceholder"
              :invalid="$form.email?.invalid"
              class="h-[42px] w-full pl-10"
              data-testid="sign-in-email"
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

        <div class="flex flex-col gap-1">
          <label
            for="sign-in-password"
            class="text-text-dark text-[13px] font-medium"
          >
            Password
          </label>
          <div class="relative">
            <LockClosedIcon
              class="text-text-muted pointer-events-none absolute top-1/2 left-3 z-10 size-4.5 -translate-y-1/2"
              aria-hidden="true"
            />
            <Password
              input-id="sign-in-password"
              name="password"
              autocomplete="current-password"
              placeholder="••••••••••"
              :feedback="false"
              :toggle-mask="false"
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

        <p
          v-if="props.errorMessage"
          class="border-destructive/20 bg-destructive/5 text-destructive rounded-sm border px-3 py-2 text-sm"
          data-testid="sign-in-error"
        >
          {{ props.errorMessage }}
        </p>

        <div class="flex flex-col gap-3 pt-1">
          <button
            type="submit"
            class="focus-visible:outline-brand flex h-11 cursor-pointer items-center justify-center gap-2 rounded-sm bg-[linear-gradient(135deg,#7a3ea8_0%,#5d2b85_100%)] px-4 text-[15px] font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="props.isSubmitting"
            data-testid="sign-in-submit"
          >
            Sign in
            <span
              class="rounded-[4px] bg-white/15 px-1.5 py-px text-[11px] font-semibold"
              aria-hidden="true"
            >
              ↵ Enter
            </span>
          </button>

          <AuthDivider label="or continue with" />

          <button
            type="button"
            class="border-divider focus-visible:outline-brand enabled:hover:bg-app-bg flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-sm border bg-white px-4 text-[15px] font-semibold text-google-text transition focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="props.isSubmitting"
            data-testid="sign-in-google"
            @click="emit('submitGoogle')"
          >
            <GoogleMark class="size-4.5 shrink-0" />
            Continue with Google
          </button>

          <button
            v-if="props.githubEnabled"
            type="button"
            class="focus-visible:outline-brand flex h-11 cursor-pointer items-center justify-center gap-2.5 rounded-sm bg-github px-4 text-[15px] font-semibold text-white transition focus-visible:outline-2 focus-visible:outline-offset-2 enabled:hover:bg-github-hover disabled:cursor-not-allowed disabled:opacity-60"
            :disabled="props.isSubmitting"
            data-testid="sign-in-github"
            @click="emit('submitGithub')"
          >
            <GithubMark class="size-4.5 shrink-0" />
            Continue with GitHub
          </button>

          <slot name="secondary-actions" />
        </div>
      </Form>

      <p class="text-text-muted text-xs leading-5">
        By continuing, you agree to your workspace authentication policy.
      </p>
    </div>
  </div>
</template>
