<script setup lang="ts">
import { computed, shallowRef } from "vue";
import { useRoute, useRouter } from "vue-router";

import { routeNames } from "@/router";
import { useAuthStore } from "@/stores/auth";

const authStore = useAuthStore();
const route = useRoute();
const router = useRouter();

const email = shallowRef("");
const errorMessage = shallowRef<string | null>(null);
const password = shallowRef("");

const redirectTarget = computed(() => {
  const redirect = route.query.redirect;

  return typeof redirect === "string" && redirect.startsWith("/")
    ? redirect
    : null;
});

async function navigateAfterLogin(): Promise<void> {
  await router.replace(redirectTarget.value ?? { name: routeNames.dashboard });
}

function getErrorMessage(error: unknown): string {
  return error instanceof Error
    ? error.message
    : "Something went wrong while signing in.";
}

async function handleEmailSignIn(): Promise<void> {
  errorMessage.value = null;

  try {
    await authStore.loginWithEmailPassword(email.value, password.value);
    await navigateAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}

async function handleGoogleSignIn(): Promise<void> {
  errorMessage.value = null;

  try {
    await authStore.loginWithGoogle();
    await navigateAfterLogin();
  } catch (error) {
    errorMessage.value = getErrorMessage(error);
  }
}
</script>

<template>
  <div class="min-h-screen bg-app-bg text-text-dark">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <section
        class="flex flex-1 flex-col justify-between bg-surface px-6 py-8 sm:px-10 sm:py-10 lg:px-14 lg:py-12"
      >
        <div class="flex items-center gap-3">
          <div
            class="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-tint text-sm font-semibold text-brand"
          >
            GT
          </div>
          <div class="flex flex-col gap-0.5">
            <p class="text-lg font-semibold text-text-dark">
              GiTiempo
            </p>
            <p class="text-[13px] text-text-muted">
              Time tracking for modern product teams
            </p>
          </div>
        </div>

        <div class="flex max-w-[520px] flex-col gap-5 py-12 lg:py-0">
          <h1 class="text-[40px] font-semibold leading-[1.1] text-text-dark">
            Track work where your tasks already live.
          </h1>
          <p class="max-w-[34rem] text-base leading-7 text-text-muted">
            Start timers from your tasks and projects in one place. Keep
            personal tracking simple while giving PMs the reporting they need.
          </p>

          <div class="grid gap-4 md:grid-cols-2">
            <article class="rounded-[10px] bg-app-bg p-4 shadow-card">
              <div class="flex flex-col gap-2">
                <p class="text-base font-semibold text-text-dark">
                  Flexible task tracking
                </p>
                <p class="text-[13px] leading-6 text-text-muted">
                  Attach tracked time to the right task context today, with room
                  for more integrations over time.
                </p>
              </div>
            </article>

            <article class="rounded-[10px] bg-app-bg p-4 shadow-card">
              <div class="flex flex-col gap-2">
                <p class="text-base font-semibold text-text-dark">
                  PM-ready reporting
                </p>
                <p class="text-[13px] leading-6 text-text-muted">
                  Review projects, entries, members, invoices, and settings
                  without leaving one workspace.
                </p>
              </div>
            </article>
          </div>
        </div>

        <div class="flex flex-wrap gap-4 text-xs font-medium text-text-muted">
          <span>Secure workspace sign-in</span>
          <span>No dark mode for MVP</span>
        </div>
      </section>

      <section
        class="flex w-full items-center justify-center bg-app-bg px-6 py-8 sm:px-10 sm:py-10 lg:w-[520px] lg:px-12 lg:py-12"
      >
        <div class="w-full rounded-[10px] bg-surface p-6 shadow-card">
          <div class="flex flex-col gap-5">
            <div class="flex flex-col gap-[6px]">
              <p class="text-[28px] font-semibold text-text-dark">
                Sign in
              </p>
              <p class="text-sm text-text-muted">
                Use your workspace account to continue into GiTiempo.
              </p>
            </div>

            <form
              class="flex flex-col gap-4"
              @submit.prevent="handleEmailSignIn"
            >
              <label
                class="flex flex-col gap-[6px] text-[13px] font-medium text-text-dark"
              >
                <span>Email</span>
                <input
                  v-model="email"
                  type="email"
                  autocomplete="email"
                  placeholder="alex@workspace.com"
                  class="h-[42px] rounded-[6px] border border-divider bg-surface px-3 text-sm text-text-dark outline-none transition focus:border-brand focus:ring-2 focus:ring-brand/15"
                >
              </label>

              <label
                class="flex flex-col gap-[6px] text-[13px] font-medium text-text-dark"
              >
                <span>Password</span>
                <div
                  class="flex h-[42px] items-center justify-between rounded-[6px] border border-divider bg-surface px-3 text-sm text-text-dark transition focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/15"
                >
                  <input
                    v-model="password"
                    type="password"
                    autocomplete="current-password"
                    placeholder="••••••••••"
                    class="min-w-0 flex-1 border-0 bg-transparent p-0 text-sm text-text-dark outline-none"
                  >
                  <button
                    type="button"
                    disabled
                    class="shrink-0 text-[13px] font-semibold text-brand"
                    aria-disabled="true"
                    title="Password recovery is not available in MVP yet"
                  >
                    Forgot?
                  </button>
                </div>
              </label>

              <p
                v-if="errorMessage"
                class="rounded-sm border border-destructive/20 bg-destructive/5 px-3 py-2 text-sm text-destructive"
              >
                {{ errorMessage }}
              </p>

              <div class="flex flex-col gap-3 pt-1">
                <button
                  type="submit"
                  class="flex h-11 items-center justify-center rounded-[6px] bg-brand px-4 text-[15px] font-semibold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="authStore.isSubmitting"
                >
                  Sign in
                </button>

                <button
                  type="button"
                  class="flex h-11 items-center justify-center rounded-[6px] border border-divider bg-surface px-4 text-[15px] font-semibold text-text-dark transition hover:bg-app-bg disabled:cursor-not-allowed disabled:opacity-70"
                  :disabled="authStore.isSubmitting"
                  @click="handleGoogleSignIn"
                >
                  Continue with Google
                </button>
              </div>
            </form>

            <p class="text-xs leading-5 text-text-muted">
              By continuing, you agree to your workspace authentication policy.
            </p>
          </div>
        </div>
      </section>
    </div>
  </div>
</template>
