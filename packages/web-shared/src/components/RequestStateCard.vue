<script setup lang="ts">
import Button from "primevue/button";

import EmptyStateBlock from "./EmptyStateBlock.vue";
import SurfaceCard from "./SurfaceCard.vue";

defineOptions({ inheritAttrs: false });

withDefaults(
  defineProps<{
    bodyClass?: string;
    border?: boolean;
    description: string | null;
    paddingClass?: string;
    retryLabel?: string | null;
    title: string;
  }>(),
  {
    bodyClass: "flex min-h-52 flex-col items-center justify-center gap-3 text-center",
    border: false,
    paddingClass: "p-6",
    retryLabel: null,
  },
);

const emit = defineEmits<{
  retry: [];
}>();
</script>

<template>
  <SurfaceCard
    v-bind="$attrs"
    :body-class="bodyClass"
    :border="border"
    :padding-class="paddingClass"
  >
    <EmptyStateBlock
      :description="description ?? ''"
      padding-class="py-0"
      :title="title"
    />
    <slot name="actions">
      <Button
        v-if="retryLabel"
        :label="retryLabel"
        severity="secondary"
        variant="outlined"
        @click="emit('retry')"
      />
    </slot>
  </SurfaceCard>
</template>
