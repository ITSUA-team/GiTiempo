<script setup lang="ts">
import { StandaloneSplitPage, SurfaceCard } from "@gitiempo/web-shared";

import RegisterFormPanel from "@/components/auth/RegisterFormPanel.vue";
import RegisterIntroPanel from "@/components/auth/RegisterIntroPanel.vue";
import { useRegisterForm } from "@/composables/auth/useRegisterForm";

const {
  fieldErrors,
  handleRegister,
  inlineErrorMessage,
  isSubmitting,
} = useRegisterForm();
</script>

<template>
  <StandaloneSplitPage left-panel-class="bg-brand">
    <template #left>
      <RegisterIntroPanel :show-mobile="false" />
    </template>

    <template #right>
      <section class="bg-app-bg flex w-full flex-1 flex-col">
        <RegisterIntroPanel :show-desktop="false" />

        <div class="flex w-full flex-1 items-start justify-center px-5 py-6 sm:px-8 sm:py-8 lg:items-center lg:px-12 lg:py-12">
          <SurfaceCard
            border
            padding-class="p-5 sm:p-6 lg:p-8"
            class="w-full max-w-[500px]"
          >
            <RegisterFormPanel
              :field-errors="fieldErrors"
              :inline-error-message="inlineErrorMessage"
              :is-submitting="isSubmitting"
              @submit="handleRegister"
            />
          </SurfaceCard>
        </div>
      </section>
    </template>
  </StandaloneSplitPage>
</template>
