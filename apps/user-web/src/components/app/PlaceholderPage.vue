<script setup lang="ts">
interface Props {
  eyebrow: string;
  subtitle: string;
  title: string;
}

const props = defineProps<Props>();
</script>

<template>
  <section class="flex flex-col gap-6 pb-20 sm:pb-0">
    <header class="flex flex-col gap-2">
      <p
        class="text-xs font-semibold uppercase tracking-[0.2em] text-text-muted"
      >
        {{ props.eyebrow }}
      </p>
      <h1 class="text-2xl font-semibold text-text-dark">
        {{ props.title }}
      </h1>
      <p class="text-sm text-text-muted">
        {{ props.subtitle }}
      </p>
    </header>

    <div class="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
      <section
        class="rounded-lg border border-divider bg-surface p-6 shadow-card"
      >
        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-text-dark">
            Page scaffold ready
          </h2>
          <p class="text-sm leading-6 text-text-muted">
            This route now mounts through the authenticated user shell and is
            ready for the next task-specific implementation pass.
          </p>
        </div>
      </section>

      <section
        class="rounded-lg border border-divider bg-surface p-6 shadow-card"
      >
        <div class="flex flex-col gap-3">
          <h2 class="text-lg font-semibold text-text-dark">
            Next step
          </h2>
          <p class="text-sm leading-6 text-text-muted">
            Replace this placeholder card with the final screen content defined
            in the user-page specifications.
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
