<script setup lang="ts">
import { computed } from 'vue';
import { Form, type FormResolverOptions } from '@primevue/forms';
import {
  timeReportExportQuerySchema,
  type TimeReportGroupBy,
} from '@gitiempo/shared';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import Select from 'primevue/select';

import type {
  ReportDateRange,
  ReportFilterOption,
  ReportSetupFilters,
} from '@/lib/report-view-model';
import { toTimeReportExportQuery } from '@/lib/report-view-model';

const props = defineProps<{
  disabled?: boolean;
  memberOptions: ReportFilterOption[];
  projectOptions: ReportFilterOption[];
}>();

const projectId = defineModel<string | null>('projectId', { required: true });
const memberId = defineModel<string | null>('memberId', { required: true });
const dateRange = defineModel<ReportDateRange>('dateRange', { required: true });
const groupBy = defineModel<TimeReportGroupBy>('groupBy', { required: true });

interface ReportsFilterFormValues {
  dateRange: ReportDateRange;
  groupBy: TimeReportGroupBy;
  memberId: string | null;
  projectId: string | null;
}

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

const initialValues = computed<ReportsFilterFormValues>(() => ({
  projectId: projectId.value,
  memberId: memberId.value,
  dateRange: dateRange.value,
  groupBy: groupBy.value,
}));

type DatePickerRangeValue = Date | (Date | null)[] | null | undefined;

function normalizeDateRangeValue(value: DatePickerRangeValue): ReportDateRange {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return [value, null];
  }

  if (value.length === 0) {
    return null;
  }

  return [value[0] ?? null, value[1] ?? null];
}

function getFormValues(values: Record<string, unknown>): ReportSetupFilters {
  return {
    dateRange: normalizeDateRangeValue(
      values.dateRange as DatePickerRangeValue,
    ),
    groupBy: (values.groupBy ?? 'project') as TimeReportGroupBy,
    memberId: (values.memberId as string | null | undefined) ?? null,
    projectId: (values.projectId as string | null | undefined) ?? null,
  };
}

function resolver({ values }: FormResolverOptions) {
  try {
    const query = toTimeReportExportQuery(getFormValues(values));
    const result = timeReportExportQuerySchema.safeParse(query);

    if (result.success) {
      return { values, errors: {} };
    }

    const errors = result.error.issues.reduce<Record<string, { message: string }[]>>(
      (current, issue) => {
        const path = issue.path[0];
        const field = path === 'dateFrom' || path === 'dateTo' ? 'dateRange' : path;

        if (typeof field === 'string') {
          current[field] = [{ message: issue.message }];
        }

        return current;
      },
      {},
    );

    return { values, errors };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid report setup';
    return { values, errors: { dateRange: [{ message }] } };
  }
}

function handleProjectUpdate(value: string | null): void {
  projectId.value = value;
}

function handleMemberUpdate(value: string | null): void {
  memberId.value = value;
}

function handleDateRangeUpdate(value: DatePickerRangeValue): void {
  dateRange.value = normalizeDateRangeValue(value);
}

function handleGroupByUpdate(value: TimeReportGroupBy): void {
  groupBy.value = value;
}

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
    v-slot="$form"
    :initial-values="initialValues"
    :resolver="resolver"
    :validate-on-value-update="true"
    class="grid w-full items-start gap-3 lg:h-[78px] lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px]"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="reports-project"
        class="text-text-dark text-[13px] font-medium"
      >Project</label>
      <Select
        input-id="reports-project"
        name="projectId"
        :model-value="projectId"
        :options="projectGenerationOptions"
        option-label="label"
        option-value="value"
        placeholder="All projects"
        :disabled="disabled"
        :pt="selectPt"
        @update:model-value="handleProjectUpdate"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-member"
        class="text-text-dark text-[13px] font-medium"
      >Member</label>
      <Select
        input-id="reports-member"
        name="memberId"
        :model-value="memberId"
        :options="memberGenerationOptions"
        option-label="label"
        option-value="value"
        placeholder="All assigned members"
        :disabled="disabled"
        :pt="selectPt"
        @update:model-value="handleMemberUpdate"
      />
    </div>

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

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-group-by"
        class="text-text-dark text-[13px] font-medium"
      >Group by</label>
      <Select
        input-id="reports-group-by"
        name="groupBy"
        :model-value="groupBy"
        :options="groupByOptions"
        option-label="label"
        option-value="value"
        :disabled="disabled"
        :pt="selectPt"
        @update:model-value="handleGroupByUpdate"
      />
    </div>
  </Form>
</template>
