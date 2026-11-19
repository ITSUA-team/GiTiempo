<script setup lang="ts">
import { invoiceSelectPt } from './invoice-field-pt';
import { computed } from 'vue';
import { invoicePaymentSchema, requiredInvoicePaymentDetails, type InvoicePayment } from '@gitiempo/shared';
import InputText from 'primevue/inputtext';
import Textarea from 'primevue/textarea';
import Select from 'primevue/select';
import Message from 'primevue/message';

const payment = defineModel<InvoicePayment>({ required: true });
const props = withDefaults(defineProps<{ disabled?: boolean; errors?: Record<string, string>; requireComplete?: boolean }>(), { disabled: false, errors: () => ({}), requireComplete: false });
const methods = computed(() => [...new Set(['Bank transfer', 'Card', 'Other', payment.value.method].filter(Boolean))]);
const fields = computed(() => {
  const common = [{ key: 'terms', label: 'Payment terms' }] as const;
  const bank = [{ key: 'beneficiary', label: 'Beneficiary' }, { key: 'provider', label: 'Bank' }, { key: 'account', label: 'IBAN / account number' }, { key: 'swift', label: 'SWIFT / BIC' }] as const;
  const card = [{ key: 'provider', label: 'Payment provider' }, { key: 'paymentUrl', label: 'Payment link (HTTPS)' }] as const;
  const other = [{ key: 'beneficiary', label: 'Beneficiary' }, { key: 'provider', label: 'Payment provider' }, { key: 'account', label: 'Payment details' }] as const;
  return [...common, ...(payment.value.method === 'Bank transfer' ? bank : payment.value.method === 'Card' ? card : other), { key: 'instructions', label: 'Payment instructions' } as const];
});
const validation = computed(() => {
  if (props.requireComplete) return {};
  const parsed = invoicePaymentSchema.safeParse(payment.value);
  return parsed.success ? {} : Object.fromEntries(parsed.error.issues.map(issue => ['payment.' + issue.path.join('.'), issue.message]));
});
const hiddenErrors = computed(() => Object.entries({ ...props.errors, ...validation.value }).filter(([key]) => key.startsWith('payment.') && key !== 'payment.method' && !fields.value.some(field => 'payment.' + field.key === key)));
function required(key: keyof InvoicePayment) {
  return props.requireComplete && (key === 'method' || requiredInvoicePaymentDetails(payment.value.method).includes(key));
}
function error(key: string) {
  return props.errors['payment.' + key] ?? validation.value['payment.' + key];
}
</script>

<template>
  <div class="flex flex-col gap-3">
    <div class="flex flex-col gap-1.5">
      <label
        for="invoice-payment-method"
        class="text-text-dark text-[13px] font-medium"
      >Payment method{{ required('method') ? ' *' : '' }}</label>
      <Select
        v-model="payment.method"
        input-id="invoice-payment-method"
        aria-label="Payment method"
        :options="methods"
        :pt="{...invoiceSelectPt, label: {...invoiceSelectPt.label, 'aria-required': required('method'), 'aria-describedby': error('method') ? 'invoice-payment-method-error' : undefined}}"
        :disabled="disabled"
        :invalid="Boolean(error('method'))"
        :aria-required="required('method')"
        :aria-describedby="error('method') ? 'invoice-payment-method-error' : undefined"
        class="text-text-dark h-[38px] w-full text-[13px] font-normal"
      />
      <Message
        v-if="error('method')"
        id="invoice-payment-method-error"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ error('method') }}
      </Message>
    </div>
    <div
      v-for="field in fields"
      :key="field.key"
      class="flex flex-col gap-1.5"
    >
      <label
        :for="'invoice-payment-' + field.key"
        class="text-text-dark text-[13px] font-medium"
      >{{ field.label }}{{ required(field.key) ? ' *' : '' }}</label>
      <Textarea
        v-if="field.key === 'account' || field.key === 'instructions'"
        :id="'invoice-payment-' + field.key"
        v-model="payment[field.key]"
        :disabled="disabled"
        :rows="field.key === 'account' ? 1 : 2"
        :invalid="Boolean(error(field.key))"
        :aria-required="required(field.key)"
        :aria-describedby="error(field.key) ? 'invoice-payment-' + field.key + '-error' : undefined"
        class="text-text-dark field-sizing-content w-full text-[13px] leading-5 font-normal"
        :class="field.key === 'instructions' ? 'min-h-[70px]' : 'min-h-[38px]'"
      />
      <InputText
        v-else
        :id="'invoice-payment-' + field.key"
        v-model="payment[field.key]"
        :disabled="disabled"
        :invalid="Boolean(error(field.key))"
        :aria-required="required(field.key)"
        :aria-describedby="error(field.key) ? 'invoice-payment-' + field.key + '-error' : undefined"
        class="text-text-dark h-[38px] w-full text-[13px] font-normal"
      />
      <Message
        v-if="error(field.key)"
        :id="'invoice-payment-' + field.key + '-error'"
        severity="error"
        size="small"
        variant="simple"
      >
        {{ error(field.key) }}
      </Message>
    </div>
    <Message
      v-for="[key, message] in hiddenErrors"
      :key="key"
      severity="error"
      size="small"
      variant="simple"
    >
      {{ key === 'payment.paymentUrl' ? 'Switch to Card to correct the payment link. ' : '' }}{{ message }}
    </Message>
  </div>
</template>
