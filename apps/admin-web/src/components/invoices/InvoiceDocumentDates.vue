<script setup lang="ts">
import { computed } from 'vue';
import DatePicker from 'primevue/datepicker';
import Message from 'primevue/message';
import { getLocalDateKey } from '@gitiempo/web-shared/time';
import { DatePickerButtonBar, useDatePickerConfirmCancel } from '@gitiempo/web-shared';
import { giTiempoDatePickerPt } from '@gitiempo/web-config/theme';
const issueDate = defineModel<Date | null>('issueDate', { required: true });
const dueDate = defineModel<Date | null>('dueDate', { required: true });
const issuePicker = useDatePickerConfirmCancel<Date | null>();
const duePicker = useDatePickerConfirmCancel<Date | null>();
const invalid = computed(() => Boolean(issueDate.value && dueDate.value && getLocalDateKey(dueDate.value) < getLocalDateKey(issueDate.value)));
</script>

<template>
  <div class="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-issue-date"
        class="text-text-dark text-[13px] font-medium"
      >Issue date</label>
      <DatePicker
        :ref="issuePicker.datePickerRef"
        v-model="issueDate"
        input-id="invoice-issue-date"
        date-format="dd M yy"
        :manual-input="false"
        show-icon
        show-button-bar
        icon-display="input"
        :pt="giTiempoDatePickerPt"
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
        v-if="!issueDate"
        severity="error"
        size="small"
        variant="simple"
      >
        Issue date is required.
      </Message>
    </div>
    <div class="flex min-w-0 flex-col gap-1.5">
      <label
        for="invoice-due-date"
        class="text-text-dark text-[13px] font-medium"
      >Due date (optional)</label>
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
        :invalid="invalid"
        :pt="giTiempoDatePickerPt"
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
        v-if="invalid"
        severity="error"
        size="small"
        variant="simple"
      >
        Due date must be on or after the issue date.
      </Message>
    </div>
  </div>
</template>
