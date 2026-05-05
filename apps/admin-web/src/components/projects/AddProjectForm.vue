<script setup lang="ts">
  import { Form, FormField } from '@primevue/forms';
  import { zodResolver } from '@primevue/forms/resolvers/zod';
  import Button from 'primevue/button';
  import InputText from 'primevue/inputtext';
  import Message from 'primevue/message';
  import { AppSelect, AppFormField } from '@gitiempo/web-shared';
  import {
    addProjectSchema,
    type AddProjectFormValues,
  } from '@/validation/projects';

  export interface PmOption {
    userId: string;
    label: string;
  }

  defineProps<{
    pmOptions: PmOption[];
    membersLoading: boolean;
    isSubmitting: boolean;
  }>();

  const emit = defineEmits<{
    submit: [values: AddProjectFormValues];
    cancel: [];
  }>();

  const initialValues: AddProjectFormValues = {
    name: '',
    visibility: 'private',
    pmUserId: null,
  };

  const visibilityOptions = [
    { label: 'Public', value: 'public' },
    { label: 'Private', value: 'private' },
  ];

  const resolver = zodResolver(addProjectSchema);

  function handleSubmit(event: {
    valid: boolean;
    values: Record<string, unknown>;
  }) {
    if (!event.valid) return;
    const result = addProjectSchema.safeParse(event.values);
    if (result.success) {
      emit('submit', result.data);
    }
  }
</script>

<template>
  <div class="bg-surface shadow-card flex flex-1 flex-col gap-3 rounded-lg p-4">
    <h2 class="text-text-dark text-[18px] font-semibold">
      Add Project Manually
    </h2>

    <Form
      v-slot="$form"
      :initial-values="initialValues"
      :resolver="resolver"
      class="flex flex-col gap-[10px]"
      @submit="handleSubmit"
    >
      <!-- Project name -->
      <FormField v-slot="$field" name="name" class="flex flex-col gap-1.5">
        <label
          for="project-name"
          class="text-text-dark text-[13px] font-medium"
        >
          Project name
        </label>
        <InputText
          id="project-name"
          name="name"
          placeholder="Enter project name"
          :maxlength="255"
          :disabled="isSubmitting"
          :invalid="$field?.invalid"
          class="w-full"
          :pt="{
            root: {
              class:
                '!h-[34px] !px-3 !rounded-[6px] !border !border-divider text-[14px] font-medium',
            },
          }"
          v-bind="$field.props"
        />
        <Message
          v-if="$field?.invalid"
          severity="error"
          size="small"
          variant="simple"
        >
          {{ $field.error?.message }}
        </Message>
      </FormField>

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
          <FormField
            v-slot="$field"
            name="pmUserId"
            :initial-value="initialValues.pmUserId"
          >
            <AppSelect
              :options="pmOptions"
              option-label="label"
              option-value="userId"
              placeholder="Select PM"
              empty-message="No PMs available"
              :disabled="isSubmitting || membersLoading"
              v-bind="$field.props"
            />
          </FormField>
        </AppFormField>
      </div>

      <!-- Visibility -->
      <AppFormField label="Visibility" size="sm">
        <FormField
          v-slot="$field"
          name="visibility"
          :initial-value="initialValues.visibility"
        >
          <AppSelect
            :options="visibilityOptions"
            option-label="label"
            option-value="value"
            :disabled="isSubmitting"
            v-bind="$field.props"
          />
        </FormField>
      </AppFormField>

      <!-- Actions -->
      <div class="flex items-center justify-end gap-[10px] pt-1">
        <Button
          type="button"
          variant="outlined"
          severity="secondary"
          label="Back"
          :disabled="isSubmitting"
          @click="emit('cancel')"
        />
        <Button
          type="submit"
          :label="isSubmitting ? 'Creating…' : 'Create project'"
          :disabled="!$form.valid || isSubmitting"
        />
      </div>
    </Form>
  </div>
</template>
