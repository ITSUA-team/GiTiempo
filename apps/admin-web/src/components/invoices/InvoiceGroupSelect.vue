<script setup lang="ts">
import { computed } from 'vue';
import Button from 'primevue/button';
import Select from 'primevue/select';
import { giTiempoFieldWidthSelectPt } from '@gitiempo/web-config/theme';

const props = defineProps<{
  inputId: string;
  label: string;
  groups: ReadonlyArray<{ id: string; name: string }>;
  loading: boolean;
  failed: boolean;
  inline?: boolean;
  disabled?: boolean;
}>();
const groupId = defineModel<string | null>({ required: true });
const emit = defineEmits<{ retry: [] }>();
const options = computed(() => [{ id: null, name: 'Ungrouped' }, ...props.groups]);
</script>

<template>
  <div class="flex min-w-0 flex-col gap-1.5">
    <div
      class="flex flex-col gap-1.5"
      :class="{ 'sm:flex-row sm:items-center sm:gap-3': inline }"
    >
      <label
        :id="inputId + '-label'"
        :for="inputId"
        class="text-text-dark text-[13px] font-medium"
      >{{ label }}</label>
      <Select
        v-model="groupId"
        :input-id="inputId"
        :aria-labelledby="inputId + '-label'"
        :placeholder="loading ? 'Loading groups…' : failed ? 'Groups unavailable' : 'Ungrouped'"
        :options="loading || failed ? [] : options"
        option-label="name"
        option-value="id"
        :loading="loading"
        :disabled="disabled || loading || failed"
        :pt="{ ...giTiempoFieldWidthSelectPt, label: { class: 'text-[13px] font-normal text-text-dark' } }"
        class="h-[38px] w-full"
        :class="{ 'sm:w-[190px]': inline }"
      />
    </div>
    <div
      v-if="failed"
      role="alert"
      class="text-destructive flex items-center gap-2 text-sm"
    >
      Could not load personal groups.
      <Button
        type="button"
        aria-label="Retry groups"
        label="Retry"
        variant="text"
        severity="secondary"
        size="small"
        :disabled="disabled || loading"
        @click="emit('retry')"
      />
    </div>
  </div>
</template>
