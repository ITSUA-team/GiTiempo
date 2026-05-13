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

defineProps<{
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

const reportsFilterSchema = z
  .object({
    projectId: z.string().min(1, 'Project is required.').nullable().optional(),
    memberId: z.string().nullable().optional(),
    dateRange: z.array(z.date().nullable()).nullable().optional(),
    groupBy: z.enum(['project', 'member']),
  })
  .refine(
    (values) => {
      const [start, end] = values.dateRange ?? [];
      return !start || !end || end.getTime() >= start.getTime();
    },
    { message: 'End date must be after the start date.', path: ['dateRange'] },
  );

const resolver = zodResolver(reportsFilterSchema);

const initialValues = {
  projectId: '',
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
  const [start, end] = dateRange.value ?? [];

  if (start && end && end.getTime() < start.getTime()) {
    return 'End date must be after the start date.';
  }

  return null;
});

const selectPt = {
  root: { class: 'h-[38px] w-full rounded-[6px] text-[14px]' },
  label: { class: 'flex items-center py-0 text-[14px] font-medium' },
} as const;
</script>

<template>
  <Form
    :resolver="resolver"
    :initial-values="initialValues"
    class="grid w-full gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,1fr)_180px]"
  >
    <div class="flex flex-col gap-1.5">
      <label
        for="reports-project"
        class="text-text-dark text-[13px] font-medium"
      >Project</label>
      <Select
        id="reports-project"
        v-model="projectId"
        name="projectId"
        :options="projectOptions"
        option-label="label"
        option-value="value"
        placeholder="Select project"
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
        id="reports-member"
        v-model="memberId"
        name="memberId"
        :options="memberOptions"
        option-label="label"
        option-value="value"
        placeholder="All assigned members"
        show-clear
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
        id="reports-date-range"
        v-model="datePickerValue"
        name="dateRange"
        selection-mode="range"
        :manual-input="false"
        show-button-bar
        placeholder="All dates"
        date-format="M d, yy"
        :disabled="disabled"
        fluid
        :invalid="!!dateRangeError"
        :pt="{
          root: { class: 'w-full' },
          input: { class: 'h-[38px] text-[14px] font-medium' },
        }"
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
        id="reports-group-by"
        v-model="groupBy"
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
