<script setup lang="ts">
import Button from 'primevue/button';
import MultiSelect from 'primevue/multiselect';
import Select from 'primevue/select';

defineProps<{
	modelMembers: string[];
	modelVisibility: 'public' | 'private';
	memberOptions: { label: string; value: string }[];
	visibilityOptions: { label: string; value: string }[];
	saving: boolean;
}>();

const emit = defineEmits<{
	'update:modelMembers': [value: string[]];
	'update:modelVisibility': [value: 'public' | 'private'];
	save: [];
	cancel: [];
}>();
</script>

<template>
  <div
    class="border-divider bg-app-bg flex flex-col gap-[10px] border-t p-4"
  >
    <p class="text-text-dark text-[13px] font-semibold">
      Project settings
    </p>

    <div class="flex items-end gap-[10px]">
      <!-- Members MultiSelect -->
      <div class="flex flex-1 flex-col gap-1.5">
        <label
          for="settings-members"
          class="text-text-muted text-xs font-medium"
        >
          Select members
        </label>
        <MultiSelect
          input-id="settings-members"
          :model-value="modelMembers"
          :options="memberOptions"
          option-label="label"
          option-value="value"
          class="h-[38px] w-full rounded-[6px]"
          placeholder="Select members"
          @update:model-value="emit('update:modelMembers', $event)"
        />
      </div>

      <!-- Visibility Select -->
      <div class="flex w-[180px] flex-col gap-1.5">
        <label
          for="settings-visibility"
          class="text-text-muted text-xs font-medium"
        >
          Visibility
        </label>
        <Select
          input-id="settings-visibility"
          :model-value="modelVisibility"
          :options="visibilityOptions"
          option-label="label"
          option-value="value"
          class="h-[38px] w-full rounded-[6px]"
          @update:model-value="emit('update:modelVisibility', $event as 'public' | 'private')"
        />
      </div>

      <!-- Cancel -->
      <Button
        severity="secondary"
        variant="outlined"
        label="Cancel"
        :pt="{
          root: 'py-2 px-[14px] rounded-[6px] text-[13px] font-medium',
        }"
        @click="emit('cancel')"
      />

      <!-- Save -->
      <Button
        label="Save"
        :pt="{
          root: 'py-2 px-[14px] rounded-[6px] bg-brand text-surface text-[13px] font-semibold',
        }"
        :loading="saving"
        @click="emit('save')"
      />
    </div>
  </div>
</template>
