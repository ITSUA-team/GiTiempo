<script setup lang="ts">
import { computed } from 'vue';
import DataTable from 'primevue/datatable';
import Column from 'primevue/column';
import { computeInvoiceAmount, type InvoiceResponse } from '@gitiempo/shared';
import { SurfaceCard, useIsMobileViewport } from '@gitiempo/web-shared';
import { formatCompactDuration } from '@gitiempo/web-shared/time';
import { formatInvoiceAmount } from '@/lib/format-currency';

const props = defineProps<{ invoice: InvoiceResponse }>();
const mobile = useIsMobileViewport();
const entryColumnPt = {
  headerCell: { class: 'h-8 bg-app-bg px-3 py-0 text-left text-xs font-semibold' },
  bodyCell: { class: 'h-10 border-divider px-3 py-1 text-[13px] break-words whitespace-pre-line' },
};
const dateFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
});
const periodFormat = new Intl.DateTimeFormat('en-GB', {
  day: '2-digit',
  month: 'short',
  year: 'numeric',
  timeZone: 'UTC',
});
const period = computed(() =>
  periodFormat
    .formatRangeToParts(
      new Date(props.invoice.dateFrom),
      new Date(props.invoice.dateTo),
    )
    .map((part) =>
      part.type === 'day' ? part.value.padStart(2, '0') : part.value,
    )
    .join(''),
);
const subtotal = computed(() =>
  computeInvoiceAmount(props.invoice.totalHours, props.invoice.hourlyRate),
);
const discount = computed(
  () =>
    (Math.round(subtotal.value * 100) -
      Math.round(props.invoice.totalAmount * 100)) /
    100,
);
const entryCount = computed(
  () =>
    `${props.invoice.timeEntryCount} ${props.invoice.timeEntryCount === 1 ? 'entry' : 'entries'} · ${props.invoice.totalHours}h`,
);
const project = computed(() => props.invoice.project?.name ?? 'Workspace-wide');
const scopeFields = computed(() => [
  ['Project', project.value],
  ['Billing period', period.value],
  ['Hourly rate', money(props.invoice.hourlyRate)],
  ['Rounding', `${props.invoice.roundingStepMinutes} min`],
]);
function money(amount: number) {
  return formatInvoiceAmount(amount, props.invoice.currency);
}
const parties = computed(() => [
  { title: 'From', party: props.invoice.sender },
  { title: 'Bill to', party: props.invoice.recipient },
]);
const paymentLines = computed(() => {
  const payment = props.invoice.payment;
  return [
    [payment?.method, payment?.terms].filter(Boolean).join(' · '),
    [
      payment?.beneficiary && `Beneficiary: ${payment.beneficiary}`,
      payment?.provider && `Bank: ${payment.provider}`,
    ]
      .filter(Boolean)
      .join(' · '),
    payment?.account && `Account: ${payment.account}`,
    [
      props.invoice.reference && `Reference: ${props.invoice.reference}`,
      payment?.instructions,
    ]
      .filter(Boolean)
      .join(' · '),
  ].filter(Boolean);
});
</script>

<template>
  <div class="grid items-start gap-4 sm:grid-cols-2 sm:gap-5">
    <SurfaceCard
      v-for="{ title, party } in parties"
      :key="title"
      padding-class="p-4 sm:p-5"
      body-class="flex flex-col gap-2.5 break-words"
      border
    >
      <h2 class="text-text-muted text-xs font-medium sm:text-[13px]">
        {{ title }}
      </h2>
      <img
        v-if="title === 'From' && invoice.logo"
        :src="invoice.logo"
        alt="Invoice sender logo"
        class="max-h-12 max-w-full self-start object-contain"
      >
      <p class="text-base font-semibold sm:text-lg">
        {{ party?.name || '—' }}
      </p>
      <div
        class="text-text-muted flex flex-col text-xs sm:gap-2.5 sm:text-[13px]"
      >
        <p
          v-if="party?.address"
          class="whitespace-pre-line"
        >
          {{ party.address }}
        </p>
        <p v-if="party?.email || party?.taxId">
          <span v-if="party.email">{{ party.email }}</span><span
            v-if="party.email && party.taxId"
            class="hidden sm:inline"
          >
            · </span><span
            v-if="party.taxId"
            class="block sm:inline"
          >Tax ID {{ party.taxId }}</span>
        </p>
      </div>
      <p
        v-if="title === 'From'"
        class="text-text-muted hidden text-xs sm:block"
      >
        Sender details saved with this invoice
      </p>
    </SurfaceCard>
  </div>

  <SurfaceCard
    border
    padding-class="p-4 sm:p-5"
    body-class="flex flex-col gap-4"
    data-testid="invoice-summary"
  >
    <h2 class="text-base font-semibold break-words sm:text-lg">
      {{ invoice.services || invoice.title }}
    </h2>
    <p
      v-if="mobile"
      class="text-text-muted text-xs"
    >
      {{ project }} · {{ period }}<br>Rate {{ money(invoice.hourlyRate) }} ·
      Rounding {{ invoice.roundingStepMinutes }} min
    </p>
    <dl
      v-else
      class="grid grid-cols-4 gap-3"
    >
      <div
        v-for="[label, value] in scopeFields"
        :key="label"
        class="flex flex-col gap-3"
      >
        <dt class="text-text-muted text-xs">
          {{ label }}
        </dt>
        <dd class="text-sm font-medium">
          {{ value }}
        </dd>
      </div>
    </dl>
    <div
      class="border-divider flex flex-col gap-2.5 rounded-lg border p-4 text-[13px] sm:gap-4 sm:rounded-none sm:border-0 sm:border-t sm:px-0 sm:pt-4 sm:pb-0"
    >
      <div class="flex items-center justify-between gap-3">
        <span>{{
          mobile
            ? entryCount
            : `${invoice.totalHours}h × ${money(invoice.hourlyRate)}`
        }}</span>
        <span data-testid="invoice-subtotal"><span :class="{ 'sr-only': mobile }">Subtotal </span>{{ money(subtotal) }}</span>
      </div>
      <div class="flex items-center justify-between gap-3">
        <span>Discount · {{ invoice.discountPercent }}%</span>
        <span data-testid="invoice-discount">{{ discount > 0 ? '−' : '' }}{{ money(Math.abs(discount)) }}</span>
      </div>
      <div
        class="border-divider flex items-center justify-between gap-3 border-t pt-2.5 font-semibold sm:border-0 sm:pt-0"
      >
        <span class="text-base">Total</span>
        <span
          class="text-brand text-lg sm:text-2xl"
          data-testid="invoice-total"
        >{{ money(invoice.totalAmount) }}</span>
      </div>
    </div>
  </SurfaceCard>

  <SurfaceCard
    border
    padding-class="p-4 sm:p-5"
    body-class="flex flex-col gap-4 sm:gap-1.5"
    data-testid="invoice-time-entries"
  >
    <div class="flex items-center justify-between gap-3">
      <h2 class="text-base font-semibold sm:text-lg">
        Included time entries<span v-if="mobile">
          · {{ invoice.timeEntryCount }}</span>
      </h2>
      <span
        v-if="!mobile"
        class="text-text-muted text-[13px]"
      >{{ entryCount }}</span>
    </div>
    <p
      v-if="!invoice.timeEntries.length"
      class="text-text-muted py-4 text-center text-sm"
      data-testid="invoice-time-entries-empty"
    >
      No time entries linked to this invoice.
    </p>
    <ul
      v-else-if="mobile"
      class="flex flex-col gap-4"
      data-testid="invoice-time-entries-cards"
    >
      <li
        v-for="entry in invoice.timeEntries"
        :key="entry.id"
        class="flex min-w-0 flex-col gap-1.5"
      >
        <div class="flex justify-between gap-3 text-[13px] font-medium">
          <span class="break-words">{{ entry.taskName || '—' }}</span>
          <span class="shrink-0">{{
            formatCompactDuration(entry.roundedDurationSeconds)
          }}</span>
        </div>
        <p class="text-text-muted text-[11px]">
          {{ dateFormat.format(new Date(entry.startedAt)) }} ·
          {{ entry.userName || 'Unknown' }}
        </p>
        <p
          v-if="entry.description"
          class="text-text-muted text-xs break-words whitespace-pre-line"
        >
          {{ entry.description }}
        </p>
      </li>
    </ul>
    <DataTable
      v-else
      :value="invoice.timeEntries"
      data-key="id"
      data-testid="invoice-time-entries-table"
      size="small"
      table-style="width: 100%; table-layout: fixed"
    >
      <Column
        header="Date"
        style="width: 112px"
        :pt="entryColumnPt"
      >
        <template #body="{ data }">
          {{ dateFormat.format(new Date(data.startedAt)) }}
        </template>
      </Column>
      <Column
        header="User"
        style="width: 150px"
        :pt="entryColumnPt"
      >
        <template #body="{ data }">
          {{ data.userName || 'Unknown' }}
        </template>
      </Column>
      <Column
        header="Task / description"
        :pt="entryColumnPt"
      >
        <template #body="{ data }">
          {{ [data.taskName, data.description].filter(Boolean).join(' · ') || '—' }}
        </template>
      </Column>
      <Column
        header="Billed duration"
        style="width: 120px"
        :pt="entryColumnPt"
      >
        <template #body="{ data }">
          {{ formatCompactDuration(data.roundedDurationSeconds) }}
        </template>
      </Column>
    </DataTable>
  </SurfaceCard>

  <SurfaceCard
    border
    padding-class="p-4 sm:p-5"
    body-class="flex flex-col gap-2.5"
  >
    <h2 class="text-base font-semibold sm:text-lg">
      {{ mobile ? 'How to pay' : 'Payment instructions' }}
    </h2>
    <p
      v-for="(line, i) in paymentLines"
      :key="i"
      class="text-text-muted text-xs break-words whitespace-pre-line sm:text-[13px]"
      :class="{ 'sm:text-text-dark sm:font-medium': i === 0 }"
    >
      {{ line }}
    </p>
    <section
      v-if="invoice.notes && !mobile"
      class="border-divider flex flex-col gap-2.5 border-t pt-2.5 text-[13px]"
    >
      <h3 class="font-medium">
        Notes
      </h3>
      <p class="text-text-muted break-words whitespace-pre-line">
        {{ invoice.notes }}
      </p>
    </section>
  </SurfaceCard>
  <p
    v-if="invoice.notes && mobile"
    class="text-text-muted text-xs break-words whitespace-pre-line"
  >
    {{ invoice.notes }}
  </p>

  <details
    class="text-text-muted text-xs"
    data-testid="invoice-audit"
  >
    <summary class="cursor-pointer">
      Invoice history
    </summary>
    <p class="mt-2">
      {{ invoice.title }}
    </p>
    <p>
      Created {{ dateFormat.format(new Date(invoice.createdAt)) }} ·
      {{ invoice.createdByName || 'Unknown' }}
    </p>
    <p>Updated {{ dateFormat.format(new Date(invoice.updatedAt)) }}</p>
  </details>
</template>
