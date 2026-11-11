<script setup lang="ts">
import { computed } from 'vue';
import { useIsMobileViewport } from '@gitiempo/web-shared';
import type { InvoiceResponse, InvoiceStatus } from '@gitiempo/shared';
import Button from 'primevue/button';
import Select from 'primevue/select';
import InvoiceGroupSelect from './InvoiceGroupSelect.vue';

const props = defineProps<{
  invoice: InvoiceResponse;
  groups: Array<{ id: string; name: string }>;
  groupsLoading: boolean;
  groupsFailed: boolean;
  moving: boolean;
  moveError: string;
  updating: boolean;
  exporting: boolean;
  canDelete: boolean;
  deleting: boolean;
}>();
const emit = defineEmits<{
  retryGroups: [];
  back: [];
  edit: [];
  copy: [];
  download: [];
  delete: [];
  move: [groupId: string | null];
  status: [status: InvoiceStatus];
}>();
const mobile = useIsMobileViewport();
const statusOptions = [
  { value: 'draft', label: 'Draft' },
  { value: 'sent', label: 'Sent' },
  { value: 'paid', label: 'Paid' },
];
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
    class="flex flex-col gap-4 sm:grid sm:grid-cols-[minmax(8rem,1fr)_minmax(0,auto)] sm:gap-x-3 sm:gap-y-6"
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
      <InvoiceGroupSelect
        input-id="detail-group"
        label="My group"
        inline
        :model-value="invoice.groupId ?? null"
        :groups="groups"
        :loading="groupsLoading"
        :failed="groupsFailed"
        :disabled="moving"
        @retry="emit('retryGroups')"
        @update:model-value="emit('move', $event)"
      />
      <span
        v-if="!mobile"
        class="text-text-muted text-xs"
      >Updated {{ dateFormat.format(new Date(invoice.updatedAt)) }}</span>
    </div>
    <div
      class="flex flex-col gap-4 sm:col-start-2 sm:row-start-1 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end sm:gap-3"
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
      <Button
        v-if="canDelete"
        label="Delete invoice"
        icon="pi pi-trash"
        severity="danger"
        outlined
        class="h-[38px]"
        :loading="deleting"
        data-testid="invoice-delete"
        @click="emit('delete')"
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
