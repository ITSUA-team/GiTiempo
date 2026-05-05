<script setup lang="ts">
  import Button from 'primevue/button';

  export interface StatCard {
    label: string;
    value: string | number;
    sub?: string;
  }

  withDefaults(
    defineProps<{
      title: string;
      subtitle?: string;
      backLabel?: string;
      titleSize?: 'lg' | 'xl';
      cards?: StatCard[];
      cardValueSize?: 'lg' | 'xl';
    }>(),
    {
      subtitle: undefined,
      backLabel: undefined,
      titleSize: 'xl',
      cards: undefined,
      cardValueSize: 'xl',
    },
  );

  const emit = defineEmits<{
    back: [];
  }>();
</script>

<template>
  <div class="flex flex-col gap-4">
    <!-- Optional back link -->
    <Button
      v-if="backLabel"
      variant="text"
      severity="primary"
      :label="`← ${backLabel}`"
      class="-mb-2 w-fit"
      pt:label:class="font-bold text-[#5d2b85] text-[13px]"
      @click="emit('back')"
    />

    <!-- Title row: heading + subtitle left, optional action slot right -->
    <div class="flex items-center justify-between">
      <div class="flex flex-col gap-1.5">
        <h1
          class="text-text-dark font-semibold leading-none"
          :class="titleSize === 'lg' ? 'text-2xl' : 'text-[28px]'"
        >
          {{ title }}
        </h1>
        <p v-if="subtitle" class="text-text-muted text-sm">
          {{ subtitle }}
        </p>
      </div>

      <!-- Optional action button(s) -->
      <slot />
    </div>

    <!-- Optional stat cards strip -->
    <div
      v-if="cards && cards.length"
      class="grid gap-4"
      :style="`grid-template-columns: repeat(${cards.length}, minmax(0, 1fr))`"
    >
      <div
        v-for="card in cards"
        :key="card.label"
        class="bg-surface shadow-card flex flex-col gap-2 rounded-lg p-4"
        :class="card.sub ? 'h-[108px]' : 'h-24'"
      >
        <span class="text-text-muted text-[13px] font-medium leading-none">
          {{ card.label }}
        </span>
        <span
          class="text-text-dark font-semibold leading-none"
          :class="cardValueSize === 'lg' ? 'text-[22px]' : 'text-[28px]'"
        >
          {{ card.value }}
        </span>
        <span v-if="card.sub" class="text-text-muted text-[12px] leading-tight">
          {{ card.sub }}
        </span>
      </div>
    </div>
  </div>
</template>
