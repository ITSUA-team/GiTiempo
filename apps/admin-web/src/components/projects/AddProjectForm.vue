<script setup lang="ts">
  import { computed, ref } from 'vue';
  import { AppInput, AppSelect, AppFormField } from '@gitiempo/web-shared';

  export interface PmOption {
    userId: string;
    label: string;
  }

  export interface AddProjectFormValues {
    name: string;
    visibility: 'public' | 'private';
    pmUserId: string | null;
  }

  const props = defineProps<{
    pmOptions: PmOption[];
    membersLoading: boolean;
    isSubmitting: boolean;
  }>();

  const emit = defineEmits<{
    submit: [values: AddProjectFormValues];
    cancel: [];
  }>();

  const projectName = ref('');
  const projectVisibility = ref<'public' | 'private'>('private');
  const selectedPmUserId = ref<string | null>(null);

  const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  const canSubmit = computed(
    () => projectName.value.trim().length > 0 && !props.isSubmitting,
  );

  function handleSubmit() {
    emit('submit', {
      name: projectName.value,
      visibility: projectVisibility.value,
      pmUserId: selectedPmUserId.value,
    });
  }
</script>

<template>
  <div class="bg-surface shadow-card flex flex-1 flex-col gap-3 rounded-lg p-4">
    <h2 class="text-text-dark text-[18px] font-semibold">
      Add Project Manually
    </h2>

    <form class="flex flex-col gap-[10px]" @submit.prevent="handleSubmit">
      <!-- Project name -->
      <AppInput
        id="project-name"
        v-model="projectName"
        label="Project name"
        placeholder="Enter project name"
        :maxlength="255"
        :disabled="isSubmitting"
      />

      <!-- Source + Project manager row -->
      <div class="flex gap-3">
        <!-- Source (read-only) -->
        <AppFormField label="Source" size="sm" class="flex-1">
          <div
            class="border-divider bg-surface text-text-dark flex h-[34px] items-center rounded-[6px] border px-3 text-[14px] font-medium"
          >
            Manual
          </div>
        </AppFormField>

        <!-- Project manager selector -->
        <AppFormField
          label="Project manager"
          size="sm"
          class="w-[160px] shrink-0"
        >
          <AppSelect
            v-model="selectedPmUserId"
            :options="pmOptions"
            option-label="label"
            option-value="userId"
            placeholder="Select PM"
            empty-message="No PMs available"
            :disabled="isSubmitting || membersLoading"
          />
        </AppFormField>
      </div>

      <!-- Visibility -->
      <AppFormField label="Visibility" size="sm">
        <AppSelect
          v-model="projectVisibility"
          :options="visibilityOptions"
          option-label="label"
          option-value="value"
          :disabled="isSubmitting"
        />
      </AppFormField>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-[10px] pt-1">
        <button
          type="button"
          class="border-divider bg-surface text-text-dark cursor-pointer rounded-[6px] border px-[14px] py-[8px] text-[13px] font-medium hover:opacity-75 disabled:opacity-50"
          :disabled="isSubmitting"
          @click="emit('cancel')"
        >
          Back
        </button>
        <button
          type="submit"
          class="bg-brand text-surface cursor-pointer rounded-[6px] px-[14px] py-[8px] text-[13px] font-semibold hover:opacity-75 disabled:opacity-50"
          :disabled="!canSubmit"
        >
          <span v-if="isSubmitting">Creating…</span>
          <span v-else>Create project</span>
        </button>
      </div>
    </form>
  </div>
</template>
