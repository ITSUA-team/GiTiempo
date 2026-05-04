<script setup lang="ts">
  import Select from 'primevue/select';

  defineOptions({ inheritAttrs: false });
</script>

<template>
  <Select
    v-bind="$attrs"
    :pt="{
      root: {
        class: '!h-[34px] !rounded-[6px] !border !border-divider w-full',
      },
      label: {
        class:
          'flex items-center h-full px-3 text-[14px] font-medium text-text-dark',
      },
      dropdown: {
        class: 'flex items-center px-2 shrink-0',
      },
    }"
  />
</template>
