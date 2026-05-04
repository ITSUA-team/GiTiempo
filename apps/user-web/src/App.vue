<script setup lang="ts">
import Toast from "primevue/toast";
</script>

<template>
  <Toast
    position="top-right"
    :pt="{
      root: 'w-80',
    }"
  />
  <RouterView />
</template>
