<script setup lang="ts">
import { computed } from 'vue';
import { useIsMobileViewport } from '@gitiempo/web-shared';
import type { InvoiceResponse, InvoiceStatus } from '@gitiempo/shared';
import Button from 'primevue/button';
import Select from 'primevue/select';

const props = defineProps<{
  invoice: InvoiceResponse;
  groups: Array<{ id: string; name: string }>;
  moving: boolean;
  moveError: string;
  updating: boolean;
  exporting: boolean;
}>();
const emit = defineEmits<{
  back: [];
  edit: [];
  copy: [];
  download: [];
  move: [groupId: string | null];
  status: [status: InvoiceStatus];
}>();
const mobile = useIsMobileViewport();
const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];
const groupOptions = computed(() => [
  { id: null, name: 'Ungrouped' },
  ...props.groups,
]);
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const actions = computed(() => {
  const edit = {
    label: 'Edit invoice',
    icon: 'pi pi-pencil',
    handler: () => emit('edit'),
    primary: true,
    busy: false,
  };
  const copy = {
    label: 'Create from this invoice',
    icon: 'pi pi-copy',
    handler: () => emit('copy'),
    primary: false,
    busy: false,
  };
  const download = {
    label: props.exporting ? 'Preparing PDF…' : 'Download PDF',
    icon: 'pi pi-download',
    handler: () => emit('download'),
    primary: false,
    busy: props.exporting,
  };
  return mobile.value ? [edit, download, copy] : [download, copy, edit];
});
</script>

<template>
  <header
    class="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(0,1fr)_auto] sm:gap-x-3 sm:gap-y-6"
    data-testid="invoice-detail-header"
  >
    <div class="flex min-w-0 items-center gap-3">
      <Button
        icon="pi pi-arrow-left"
        outlined
        severity="secondary"
        aria-label="Back to invoices"
        class="h-[38px] w-[38px] shrink-0"
        data-testid="invoice-back-button"
        @click="emit('back')"
      />
      <h1
        class="text-text-dark min-w-0 text-xl font-semibold break-all sm:text-2xl"
      >
        {{ invoice.reference || invoice.title }}
      </h1>
    </div>
    <div
      class="flex flex-col gap-4 sm:col-span-2 sm:row-start-2 sm:flex-row sm:items-center sm:gap-3"
      data-testid="invoice-status-actions"
    >
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label
          for="detail-status"
          class="text-[13px] font-medium"
        >Status</label>
        <Select
          input-id="detail-status"
          aria-label="Invoice status"
          :model-value="invoice.status"
          :options="statusOptions"
          option-label="label"
          option-value="value"
          class="h-[38px] sm:w-[150px]"
          :disabled="updating"
          @update:model-value="emit('status', $event)"
        >
          <template #option="{ option }">
            <span class="flex w-full items-center justify-between gap-3">{{ option.label
            }}<i
              v-if="option.value === invoice.status"
              class="pi pi-check"
              aria-hidden="true"
            /></span>
          </template>
        </Select>
      </div>
      <div class="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:gap-3">
        <label
          for="detail-group"
          class="text-[13px] font-medium"
        >My group</label>
        <Select
          input-id="detail-group"
          placeholder="Ungrouped"
          :model-value="invoice.groupId ?? null"
          :options="groupOptions"
          option-label="name"
          option-value="id"
          class="h-[38px] sm:w-[190px]"
          :disabled="moving"
          @update:model-value="emit('move', $event)"
        />
      </div>
      <span
        v-if="!mobile"
        class="text-text-muted text-xs"
      >Updated {{ dateFormat.format(new Date(invoice.updatedAt)) }}</span>
    </div>
    <div
      class="flex flex-col gap-4 sm:col-start-2 sm:row-start-1 sm:flex-row sm:items-center sm:gap-3"
    >
      <Button
        v-for="action in actions"
        :key="action.icon"
        :label="action.label"
        :icon="action.icon"
        :loading="action.busy"
        :outlined="!action.primary"
        :severity="action.primary ? undefined : 'secondary'"
        class="h-[38px]"
        @click="action.handler"
      />
    </div>
    <p
      v-if="moveError"
      role="alert"
      class="text-destructive text-sm sm:col-span-2"
    >
      {{ moveError }}
    </p>
  </header>
</template>
