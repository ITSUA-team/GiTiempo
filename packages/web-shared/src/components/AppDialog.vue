<script setup lang="ts">
import Dialog from "primevue/dialog";
import { computed, useAttrs } from "vue";

defineOptions({ inheritAttrs: false });

// One padding scheme for every dialog. A consumer :pt can still override
// individual sections (root width, scrollable content), but padding no longer
// has to be re-declared per dialog.
const appDialogDefaultPt = {
  header: "px-6 pt-6 pb-0",
  content: "px-6 pb-6 pt-4",
  footer: "px-6 pb-6 pt-0",
} as const;

const attrs = useAttrs();
const restAttrs = computed(() => {
  const { pt: _pt, ...rest } = attrs;

  return rest;
});
const mergedPt = computed(() => ({
  ...appDialogDefaultPt,
  ...((attrs.pt as Record<string, unknown> | undefined) ?? {}),
}));
</script>

<template>
  <Dialog
    v-bind="restAttrs"
    :pt="mergedPt"
  >
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
