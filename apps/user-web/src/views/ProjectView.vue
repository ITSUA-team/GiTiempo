<script setup lang="ts">
import { computed } from "vue";
import { useRoute } from "vue-router";
import { PlaceholderPage } from "@gitiempo/web-shared";


const route = useRoute();

const projectId = computed(() => String(route.params.projectId ?? "project"));
</script>

<template>
  <PlaceholderPage
    eyebrow="Project View"
    primary-title="Page scaffold ready"
    primary-body="This route now mounts through the authenticated user shell and is ready for the next task-specific implementation pass."
    secondary-body="Replace this placeholder card with the final screen content defined in the user-page specifications."
    :subtitle="`Read-only entries and totals for project ${projectId} will render here.`"
    :title="`Project ${projectId}`"
  />
</template>
