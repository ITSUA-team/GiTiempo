<script setup lang="ts">
import { computed } from 'vue';
import { z } from 'zod';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import Select from 'primevue/select';

import type {
  ReportDateRange,
  ReportFilterOption,
  ReportGroupBy,
} from '@/composables/useReportsData';
import { getReportDateRangeError } from '@/composables/useReportsData';

const props = defineProps<{
  disabled?: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
}>();

const projectId = defineModel<string | null>('projectId', { required: true });
const memberId = defineModel<string | null>('memberId', { required: true });
const dateRange = defineModel<ReportDateRange>('dateRange', { required: true });
const groupBy = defineModel<ReportGroupBy>('groupBy', { required: true });

const groupByOptions: { label: string; value: ReportGroupBy }[] = [
  { label: 'Project', value: 'project' },
  { label: 'Member', value: 'member' },
];

const projectGenerationOptions = computed(() => [
  { label: 'All projects', value: null },
  ...props.projectOptions,
]);
const memberGenerationOptions = computed(() => [
  { label: 'All assigned members', value: null },
  ...props.memberOptions,
]);

const reportsFilterSchema = z
  .object({
    projectId: z.string().nullable().optional(),
    memberId: z.string().nullable().optional(),
    dateRange: z.array(z.date().nullable()).nullable().optional(),
    groupBy: z.enum(['project', 'member']),
  })
  .refine(
    (values) => {
      return getReportDateRangeError(values.dateRange as ReportDateRange) === null;
    },
    { message: 'End date must be after the start date.', path: ['dateRange'] },
  );

const resolver = zodResolver(reportsFilterSchema);

const initialValues = {
  projectId: null,
  memberId: null,
  dateRange: null,
  groupBy: 'project',
};

const datePickerValue = computed<Date[] | null>({
  get() {
    const selectedRange = dateRange.value;

    if (!selectedRange) {
      return null;
    }

    return selectedRange.filter((date): date is Date => date instanceof Date);
  },
  set(value) {
    if (!value || value.length === 0) {
      dateRange.value = null;
      return;
    }

    dateRange.value = [value[0] ?? null, value[1] ?? null];
  },
});

const dateRangeError = computed(() => {
  return getReportDateRangeError(dateRange.value);
});

const selectPt = {
  root: {
    class:
      'border-divider bg-surface h-[38px] w-full rounded-[6px] border shadow-none',
  },
  label: {
    class:
      'flex items-center px-3 py-0 text-[14px] font-medium text-text-dark',
  },
  dropdown: { class: 'w-9 text-text-muted' },
} as const;

const datePickerPt = {
  root: { class: 'w-full' },
  pcInputText: {
    root: {
      class:
        'border-divider bg-surface h-[38px] rounded-[6px] border px-3 text-[14px] font-medium text-text-dark shadow-none',
    },
  },
} as const;
</script>

<template>
  <Form
    :resolver="resolver"
    :initial-values="initialValues"
    class="grid w-full items-start gap-3 lg:h-[78px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px]"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="reports-project"
        class="text-text-dark text-[13px] font-medium"
      >Project</label>
      <Select
        v-model="projectId"
        input-id="reports-project"
        name="projectId"
        :options="projectGenerationOptions"
        option-label="label"
        option-value="value"
        placeholder="All projects"
        :disabled="disabled"
        :pt="selectPt"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-member"
        class="text-text-dark text-[13px] font-medium"
      >Member</label>
      <Select
        v-model="memberId"
        input-id="reports-member"
        name="memberId"
        :options="memberGenerationOptions"
        option-label="label"
        option-value="value"
        placeholder="All assigned members"
        :disabled="disabled"
        :pt="selectPt"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-date-range"
        class="text-text-dark text-[13px] font-medium"
      >Date range</label>
      <DatePicker
        v-model="datePickerValue"
        input-id="reports-date-range"
        name="dateRange"
        selection-mode="range"
        :manual-input="false"
        show-button-bar
        placeholder="All dates"
        date-format="M d, yy"
        :disabled="disabled"
        fluid
        :invalid="!!dateRangeError"
        :pt="datePickerPt"
      />
      <Message
        v-if="dateRangeError"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ dateRangeError }}
      </Message>
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-group-by"
        class="text-text-dark text-[13px] font-medium"
      >Group by</label>
      <Select
        v-model="groupBy"
        input-id="reports-group-by"
        name="groupBy"
        :options="groupByOptions"
        option-label="label"
        option-value="value"
        :disabled="disabled"
        :pt="selectPt"
      />
    </div>
  </Form>
</template>
