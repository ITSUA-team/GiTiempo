<script setup lang="ts">
import { ChevronDownIcon } from '@heroicons/vue/24/outline';
import Avatar from 'primevue/avatar';
import Button from 'primevue/button';
import type { MembersTableRow } from '@/lib/members-table';

defineProps<{
  row: MembersTableRow;
  expanded: boolean;
  disabled?: boolean;
  mobile?: boolean;
}>();

const emit = defineEmits<{ edit: [] }>();
</script>

<template>
  <Button
    type="button"
    unstyled
    :disabled="disabled"
    :aria-expanded="expanded"
    :aria-label="`Edit member ${row.primaryLabel}`"
    class="group focus-visible:outline-brand flex w-full gap-3 rounded-none border-0 bg-transparent p-0 text-left shadow-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 enabled:cursor-pointer disabled:cursor-default disabled:opacity-60"
    :class="mobile ? 'items-start' : 'items-center'"
    @click="emit('edit')"
  >
    <Avatar
      :image="row.avatarImage"
      :label="row.avatarLabel"
      shape="circle"
      class="shrink-0"
      :class="mobile ? 'size-9' : 'size-8'"
      :pt="{ root: 'bg-accent-tint text-brand text-[13px] font-semibold' }"
    />
    <span
      class="min-w-0"
      :class="mobile ? 'flex-1' : 'flex flex-col'"
    >
      <span
        class="text-brand inline-flex max-w-full items-center gap-1.5 font-sans leading-none font-semibold"
        :class="mobile ? 'text-[15px]' : 'text-[14px]'"
      >
        <span class="truncate">{{ row.primaryLabel }}</span>
        <span
          aria-hidden="true"
          class="flex size-[18px] shrink-0 items-center justify-center rounded-full transition-colors duration-200"
          :class="expanded ? 'bg-accent-tint' : 'bg-app-bg group-hover:bg-accent-tint'"
        >
          <ChevronDownIcon
            class="size-[11px] stroke-[2.5] transition-all duration-200"
            :class="expanded ? 'text-brand rotate-180' : 'text-text-muted group-hover:text-brand'"
          />
        </span>
      </span>
      <span
        v-if="row.secondaryLabel"
        class="text-text-muted text-[12px]"
        :class="{ 'block truncate': mobile }"
      >{{ row.secondaryLabel }}</span>
    </span>
  </Button>
</template>
