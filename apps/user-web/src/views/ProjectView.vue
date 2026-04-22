<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";

import PlaceholderPage from "@/components/app/PlaceholderPage.vue";

const route = useRoute();

const projectId = computed(() => String(route.params.projectId ?? "project"));
</script>

<template>
  <PlaceholderPage
    eyebrow="Project View"
    :subtitle="`Read-only entries and totals for project ${projectId} will render here.`"
    :title="`Project ${projectId}`"
  />
</template>
