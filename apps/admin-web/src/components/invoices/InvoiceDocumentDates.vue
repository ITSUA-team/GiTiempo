<script setup lang="ts">
import { invoiceDatePickerPt } from './invoice-field-pt';
import { computed } from 'vue';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import { getLocalDateKey } from '@gitiempo/web-shared/time';
import { DatePickerButtonBar, useDatePickerConfirmCancel } from '@gitiempo/web-shared';
const props = withDefaults(defineProps<{ validationTriggered?: boolean; errors?: Record<string, string> }>(), { validationTriggered: true, errors: () => ({}) });
const issueDate = defineModel<Date | null>('issueDate', { required: true });
const dueDate = defineModel<Date | null>('dueDate', { required: true });
const issuePicker = useDatePickerConfirmCancel<Date | null>();
const duePicker = useDatePickerConfirmCancel<Date | null>();
const invalid = computed(() => Boolean(issueDate.value && dueDate.value && getLocalDateKey(dueDate.value) < getLocalDateKey(issueDate.value)));
const issueError = computed(() => props.validationTriggered ? props.errors.issueDate ?? (!issueDate.value ? 'Issue date is required.' : undefined) : undefined);
const dueError = computed(() => props.validationTriggered ? props.errors.dueDate ?? (invalid.value ? 'Due date must be on or after the issue date.' : undefined) : undefined);
const issueDatePt = computed(() => ({
  ...invoiceDatePickerPt,
  pcInputText: {
    ...invoiceDatePickerPt.pcInputText,
    root: {
      ...invoiceDatePickerPt.pcInputText.root,
      'aria-required': true,
      'aria-describedby': issueError.value ? 'invoice-issue-date-error' : undefined,
    },
  },
}));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-issue-date"
        class="text-text-dark text-[13px] font-medium"
      >Issue date *</label>
      <DatePicker
        :ref="issuePicker.datePickerRef"
        v-model="issueDate"
        input-id="invoice-issue-date"
        date-format="dd M yy"
        :manual-input="false"
        :invalid="Boolean(issueError)"
        show-icon
        show-button-bar
        icon-display="input"
        :pt="issueDatePt"
        class="w-full"
        @show="issuePicker.handleShow"
      >
        <template #buttonbar>
          <DatePickerButtonBar
            @cancel="issuePicker.handleCancel"
            @confirm="issuePicker.handleConfirm"
          />
        </template>
      </DatePicker>
      <Message
        v-if="issueError"
        id="invoice-issue-date-error"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ issueError }}
      </Message>
    </div>
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-due-date"
        class="text-text-dark text-[13px] font-medium"
      >Due date</label>
      <DatePicker
        :ref="duePicker.datePickerRef"
        v-model="dueDate"
        input-id="invoice-due-date"
        date-format="dd M yy"
        :manual-input="false"
        show-icon
        show-clear
        show-button-bar
        icon-display="input"
        :invalid="Boolean(dueError)"
        :aria-describedby="dueError ? 'invoice-due-date-error' : undefined"
        :pt="{...invoiceDatePickerPt, pcInputText: {...invoiceDatePickerPt.pcInputText, root: {...invoiceDatePickerPt.pcInputText.root, 'aria-describedby': dueError ? 'invoice-due-date-error' : undefined}}}"
        class="w-full"
        @show="duePicker.handleShow"
      >
        <template #buttonbar>
          <DatePickerButtonBar
            @cancel="duePicker.handleCancel"
            @confirm="duePicker.handleConfirm"
          />
        </template>
      </DatePicker>
      <Message
        v-if="dueError"
        id="invoice-due-date-error"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ dueError }}
      </Message>
    </div>
  </div>
</template>
