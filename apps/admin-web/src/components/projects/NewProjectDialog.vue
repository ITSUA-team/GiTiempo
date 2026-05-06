<script setup lang="ts">
import Button from 'primevue/button';
import Dialog from 'primevue/dialog';
import InputText from 'primevue/inputtext';
import Select from 'primevue/select';
import { ref, watch } from 'vue';

const props = defineProps<{
    visible: boolean;
    saving: boolean;
    visibilityOptions: { label: string; value: string }[];
}>();

const emit = defineEmits<{
    'update:visible': [value: boolean];
    'submit': [payload: { name: string; visibility: 'public' | 'private' }];
}>();

const name = ref('');
const visibility = ref<'public' | 'private'>('public');
const nameError = ref('');

watch(
    () => props.visible,
    (val) => {
        if (val) {
            name.value = '';
            visibility.value = 'public';
            nameError.value = '';
        }
    },
);

function handleSubmit(): void {
    nameError.value = '';
    if (!name.value.trim()) {
        nameError.value = 'Project name is required.';
        return;
    }
    emit('submit', { name: name.value.trim(), visibility: visibility.value });
}
</script>

<template>
  <Dialog
    :visible="visible"
    header="New Project"
    modal
    class="w-[480px]"
    @update:visible="emit('update:visible', $event)"
  >
    <div class="flex flex-col gap-4 pt-2">
      <!-- Name field -->
      <div class="flex flex-col gap-1">
        <label class="text-text-dark text-[13px] font-medium">
          Project name
        </label>
        <InputText
          v-model="name"
          :invalid="!!nameError"
          class="w-full"
          placeholder="e.g. Project Orion"
        />
        <small
          v-if="nameError"
          class="text-destructive text-xs"
        >
          {{ nameError }}
        </small>
      </div>

      <!-- Visibility field -->
      <div class="flex flex-col gap-1">
        <label class="text-text-dark text-[13px] font-medium">
          Visibility
        </label>
        <Select
          v-model="visibility"
          :options="visibilityOptions"
          option-label="label"
          option-value="value"
          class="w-full"
        />
      </div>
    </div>

    <template #footer>
      <div class="flex justify-end gap-2">
        <Button
          severity="secondary"
          variant="outlined"
          label="Cancel"
          @click="emit('update:visible', false)"
        />
        <Button
          label="Create"
          :loading="saving"
          @click="handleSubmit"
        />
      </div>
    </template>
  </Dialog>
</template>
