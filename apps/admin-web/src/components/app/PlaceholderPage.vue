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
            Route scaffold ready
          </h2>
          <p class="text-sm leading-6 text-text-muted">
            This admin route now resolves through the protected app shell and is
            ready for the next screen-specific implementation pass.
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
            Replace this scaffold with the final admin page content defined in
            the project UI docs.
          </p>
        </div>
      </section>
    </div>
  </section>
</template>
