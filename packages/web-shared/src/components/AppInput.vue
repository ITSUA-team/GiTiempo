<script setup lang="ts">
  import InputText from 'primevue/inputtext';

  const props = defineProps<{
    id: string;
    label: string;
    modelValue: string;
    placeholder?: string;
    maxlength?: number;
    type?: string;
    disabled?: boolean;
    error?: string;
    helper?: string;
  }>();

  const emit = defineEmits<{
    'update:modelValue': [value: string];
  }>();
</script>

<template>
  <div class="flex flex-col gap-1.5">
    <label :for="props.id" class="text-text-dark text-[13px] font-medium">
      {{ props.label }}
    </label>
    <InputText
      :id="props.id"
      :value="props.modelValue"
      :placeholder="props.placeholder"
      :maxlength="props.maxlength"
      :type="props.type ?? 'text'"
      :disabled="props.disabled"
      class="w-full"
      :pt="{
        root: {
          class:
            '!h-[34px] !px-3 !rounded-[6px] !border !border-divider text-[14px] font-medium',
        },
      }"
      @input="
        emit('update:modelValue', ($event.target as HTMLInputElement).value)
      "
    />
    <span v-if="props.error" class="text-destructive text-[12px]">
      {{ props.error }}
    </span>
    <span v-else-if="props.helper" class="text-text-muted text-[12px]">
      {{ props.helper }}
    </span>
  </div>
</template>
