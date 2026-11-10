<script setup lang="ts">
import Button from "primevue/button";

defineEmits<{
  cancel: [];
  confirm: [];
}>();
</script>

<template>
  <div class="flex w-full items-center justify-end gap-2">
    <Button
      label="Cancel"
      severity="secondary"
      size="small"
      variant="text"
      data-testid="date-picker-cancel"
      @click="$emit('cancel')"
    />
    <Button
      label="Confirm"
      size="small"
      data-testid="date-picker-confirm"
      @click="$emit('confirm')"
    />
  </div>
</template>