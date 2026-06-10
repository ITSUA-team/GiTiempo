<script setup lang="ts">
import { computed } from 'vue';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import type { TimeReportGroupBy } from '@gitiempo/shared';
import {
  AutocompleteField,
  type AutocompleteFieldValue,
  normalizeReportDateRangeValue,
  reportFilterFormSchema,
  type ReportDatePickerRangeValue,
  type ReportFilterFormValues,
} from '@gitiempo/web-shared';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';

import type {
  ReportDateRange,
  ReportFilterOption,
} from '@/lib/report-view-model';

const props = defineProps<{
  disabled?: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
}>();

const projectId = defineModel<string | null>('projectId', { required: true });
const memberId = defineModel<string | null>('memberId', { required: true });
const dateRange = defineModel<ReportDateRange>('dateRange', { required: true });
const groupBy = defineModel<TimeReportGroupBy>('groupBy', { required: true });

const groupByOptions: { label: string; value: TimeReportGroupBy }[] = [
  { label: 'Project', value: 'project' },
  { label: 'Member', value: 'user' },
];

const projectGenerationOptions = computed(() => [
  { label: 'All projects', value: null },
  ...props.projectOptions,
]);
const memberGenerationOptions = computed(() => [
  { label: 'All assigned members', value: null },
  ...props.memberOptions,
]);

const initialValues = computed<ReportFilterFormValues>(() => ({
  projectId: projectId.value,
  memberId: memberId.value,
  dateRange: dateRange.value,
  groupBy: groupBy.value,
}));

const resolver = zodResolver(reportFilterFormSchema);

function handleProjectUpdate(value: string | null): void {
  projectId.value = value;
}

function handleMemberUpdate(value: string | null): void {
  memberId.value = value;
}

function handleDateRangeUpdate(value: ReportDatePickerRangeValue): void {
  dateRange.value = normalizeReportDateRangeValue(value);
}

function handleGroupByUpdate(value: TimeReportGroupBy): void {
  groupBy.value = value;
}

function getNullableStringValue(value: AutocompleteFieldValue): string | null {
  return typeof value === 'string' ? value : null;
}

function handleProjectAutocompleteUpdate(value: AutocompleteFieldValue): void {
  handleProjectUpdate(getNullableStringValue(value));
}

function handleMemberAutocompleteUpdate(value: AutocompleteFieldValue): void {
  handleMemberUpdate(getNullableStringValue(value));
}

function handleGroupByAutocompleteUpdate(value: AutocompleteFieldValue): void {
  if (value === 'project' || value === 'user') {
    handleGroupByUpdate(value);
  }
}

const datePickerPt = {
  root: { class: 'w-full' },
  pcInputText: {
    root: {
      class:
        'border-divider bg-surface-primary h-[38px] rounded-[6px] border px-3 text-[14px] font-medium text-text-dark shadow-none',
    },
  },
} as const;
</script>

<template>
  <Form
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    :validate-on-mount="true"
    :validate-on-value-update="true"
    class="grid w-full items-start gap-3 lg:h-[78px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px_auto]"
  >
    <AutocompleteField
      input-id="reports-project"
      label="Project"
      name="projectId"
      :model-value="projectId"
      :options="projectGenerationOptions"
      placeholder="All projects"
      :disabled="disabled"
      @update:model-value="handleProjectAutocompleteUpdate"
    />

    <AutocompleteField
      input-id="reports-member"
      label="Member"
      name="memberId"
      :model-value="memberId"
      :options="memberGenerationOptions"
      placeholder="All assigned members"
      :disabled="disabled"
      @update:model-value="handleMemberAutocompleteUpdate"
    />

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-date-range"
        class="text-text-dark text-[13px] font-medium"
      >Date range</label>
      <DatePicker
        input-id="reports-date-range"
        name="dateRange"
        :model-value="dateRange"
        selection-mode="range"
        :manual-input="false"
        show-button-bar
        placeholder="All dates"
        date-format="M d, yy"
        :disabled="disabled"
        fluid
        :invalid="$form.dateRange?.invalid === true"
        :pt="datePickerPt"
        @update:model-value="handleDateRangeUpdate"
      />
      <Message
        v-if="$form.dateRange?.invalid"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ $form.dateRange.error?.message }}
      </Message>
    </div>

    <AutocompleteField
      input-id="reports-group-by"
      label="Group by"
      name="groupBy"
      :model-value="groupBy"
      :options="groupByOptions"
      :disabled="disabled"
      @update:model-value="handleGroupByAutocompleteUpdate"
    />

    <div
      v-if="$slots.actions"
      class="flex flex-col gap-1.5 lg:min-w-[110px]"
    >
      <span
        aria-hidden="true"
        class="hidden h-[19px] lg:block"
      />
      <slot name="actions" />
    </div>
  </Form>
</template>
