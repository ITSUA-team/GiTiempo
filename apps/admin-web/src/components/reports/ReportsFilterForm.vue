<script setup lang="ts">
import { computed, ref } from 'vue';
import { Form } from '@primevue/forms';
import { zodResolver } from '@primevue/forms/resolvers/zod';
import type { TimeReportGroupBy } from '@gitiempo/shared';
import { composeGiTiempoSelfAppendedAutoCompletePt } from '@gitiempo/web-config/theme';
import {
  normalizeReportDateRangeValue,
  filterAutocompleteOptions,
  reportFilterFormSchema,
  type ReportDatePickerRangeValue,
  type ReportFilterFormValues,
} from '@gitiempo/web-shared';
import AutoComplete from 'primevue/autocomplete';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import Select from 'primevue/select';

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

const projectSuggestions = ref<ReportFilterOption[]>([]);
const memberSuggestions = ref<ReportFilterOption[]>([]);
const selectedProjectOption = computed(
  () =>
    props.projectOptions.find((option) => option.value === projectId.value) ?? null,
);
const selectedMemberOption = computed(
  () =>
    props.memberOptions.find((option) => option.value === memberId.value) ?? null,
);

const initialValues = computed<ReportFilterFormValues>(() => ({
  projectId: projectId.value,
  memberId: memberId.value,
  dateRange: dateRange.value,
  groupBy: groupBy.value,
}));

const resolver = zodResolver(reportFilterFormSchema);

function handleProjectComplete(event: { query: string }): void {
  projectSuggestions.value = filterAutocompleteOptions(
    props.projectOptions,
    event.query,
    (option) => option.label,
  );
}

function handleMemberComplete(event: { query: string }): void {
  memberSuggestions.value = filterAutocompleteOptions(
    props.memberOptions,
    event.query,
    (option) => option.label,
  );
}

function handleProjectUpdate(value: ReportFilterOption | string | null): void {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      projectId.value = null;
    }

    return;
  }

  projectId.value = value?.value ?? null;
}

function handleMemberUpdate(value: ReportFilterOption | string | null): void {
  if (typeof value === 'string') {
    if (value.trim().length === 0) {
      memberId.value = null;
    }

    return;
  }

  memberId.value = value?.value ?? null;
}

function handleDateRangeUpdate(value: ReportDatePickerRangeValue): void {
  dateRange.value = normalizeReportDateRangeValue(value);
}

function handleGroupByUpdate(value: TimeReportGroupBy): void {
  groupBy.value = value;
}

const autoCompletePt = composeGiTiempoSelfAppendedAutoCompletePt({
  pcInputText: {
    root: {
      class:
        'border-divider bg-surface-primary h-[38px] rounded-l-[6px] rounded-r-none border px-3 text-[14px] font-medium text-text-dark shadow-none',
    },
  },
  dropdown: { class: 'w-9 text-text-muted' },
});

const selectPt = {
  root: {
    class:
      'border-divider bg-surface-primary h-[38px] w-full rounded-[6px] border shadow-none',
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
    <div class="flex flex-col gap-1.5">
      <label
        for="reports-project"
        class="text-text-dark text-[13px] font-medium"
      >Project</label>
      <AutoComplete
        append-to="self"
        input-id="reports-project"
        name="projectId"
        :model-value="selectedProjectOption"
        :suggestions="projectSuggestions"
        complete-on-focus
        dropdown
        dropdown-mode="blank"
        force-selection
        :min-length="0"
        option-label="label"
        placeholder="All projects"
        show-clear
        :disabled="disabled"
        :pt="autoCompletePt"
        @complete="handleProjectComplete"
        @update:model-value="handleProjectUpdate"
      />
    </div>

    <div class="flex flex-col gap-1.5">
      <label
        for="reports-member"
        class="text-text-dark text-[13px] font-medium"
      >Member</label>
      <AutoComplete
        append-to="self"
        input-id="reports-member"
        name="memberId"
        :model-value="selectedMemberOption"
        :suggestions="memberSuggestions"
        complete-on-focus
        dropdown
        dropdown-mode="blank"
        force-selection
        :min-length="0"
        option-label="label"
        placeholder="All assigned members"
        show-clear
        :disabled="disabled"
        :pt="autoCompletePt"
        @complete="handleMemberComplete"
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
        show-clear
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
