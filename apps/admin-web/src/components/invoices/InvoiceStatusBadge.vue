<script setup lang="ts">
import { computed } from 'vue';
import type { InvoiceStatus } from '@gitiempo/shared';
import Tag from 'primevue/tag';

interface InvoiceStatusTagConfig {
  ptRoot: string;
  severity?: 'success' | 'warn';
  value: string;
}

const tagBaseRoot = 'rounded-sm px-2 py-0.5 text-xs font-medium';

const tagConfigByStatus: Record<InvoiceStatus, InvoiceStatusTagConfig> = {
  draft: {
    ptRoot: `${tagBaseRoot} bg-status-warn-bg text-status-warn-text`,
    severity: 'warn',
    value: 'Draft',
  },
  sent: {
    ptRoot: `${tagBaseRoot} bg-accent-tint text-brand`,
    value: 'Sent',
  },
  paid: {
    ptRoot: `${tagBaseRoot} bg-status-active-bg text-status-active-text`,
    severity: 'success',
    value: 'Paid',
  },
};

const props = defineProps<{
  status: InvoiceStatus;
}>();

const tagConfig = computed(() => tagConfigByStatus[props.status]);
</script>

<template>
  <Tag
    :pt="{ label: 'leading-none', root: tagConfig.ptRoot }"
    :severity="tagConfig.severity"
    :value="tagConfig.value"
    data-testid="invoice-status-badge"
  />
</template>