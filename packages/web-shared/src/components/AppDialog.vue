<script setup lang="ts">
import Dialog from "primevue/dialog";

defineOptions({ inheritAttrs: false });
</script>

<template>
  <Dialog v-bind="$attrs">
    <template
      v-if="$slots.header"
      #header
    >
      <slot name="header" />
    </template>

    <span
      autofocus
      class="sr-only"
      data-gitiempo-dialog-initial-focus="true"
      tabindex="-1"
    >Dialog content</span>
    <slot />

    <template
      v-if="$slots.footer"
      #footer
    >
      <slot name="footer" />
    </template>
  </Dialog>
</template>
