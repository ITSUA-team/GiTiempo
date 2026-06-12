<script setup lang="ts">
import RegisterFormPanel from "@/components/auth/RegisterFormPanel.vue";
import RegisterIntroPanel from "@/components/auth/RegisterIntroPanel.vue";
import { useRegisterForm } from "@/composables/auth/useRegisterForm";

const {
  fieldErrors,
  form,
  handleRegister,
  inlineErrorMessage,
  isSubmitting,
} = useRegisterForm();
</script>

<template>
  <div class="bg-app-bg text-text-dark min-h-screen">
    <div class="mx-auto flex min-h-screen max-w-[1280px] flex-col lg:flex-row">
      <RegisterIntroPanel :show-mobile="false" />

      <section class="bg-app-bg flex w-full flex-1 flex-col">
        <RegisterIntroPanel :show-desktop="false" />

        <div class="flex w-full flex-1 items-start justify-center px-5 py-6 sm:px-8 sm:py-8 lg:items-center lg:px-12 lg:py-12">
          <RegisterFormPanel
            v-model:confirm-password="form.confirmPassword"
            v-model:email="form.email"
            v-model:full-name="form.fullName"
            v-model:owner-acknowledgement="form.ownerAcknowledgement"
            v-model:password="form.password"
            v-model:workspace-name="form.workspaceName"
            :field-errors="fieldErrors"
            :inline-error-message="inlineErrorMessage"
            :is-submitting="isSubmitting"
            @submit="handleRegister"
          />
        </div>
      </section>
    </div>
  </div>
</template>
