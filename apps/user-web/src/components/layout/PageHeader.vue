<script setup lang="ts">
import { SectionHeader } from "@gitiempo/web-shared";

const props = defineProps<{
  subtitle: string;
  title: string;
}>();
</script>

<template>
  <SectionHeader
    :description="props.subtitle"
    :title="props.title"
    variant="page"
  />
</template>
