import { mount } from '@vue/test-utils';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { reactive } from 'vue';
import PrimeVue from 'primevue/config';
import Select from 'primevue/select';
import InvoicePaymentFields from './InvoicePaymentFields.vue';
import type { InvoicePayment } from '@gitiempo/shared';

describe('InvoicePaymentFields', () => {
  beforeEach(() => vi.stubGlobal('matchMedia', vi.fn(() => ({matches:false,addEventListener:vi.fn(),removeEventListener:vi.fn(),addListener:vi.fn(),removeListener:vi.fn()}))));
  afterEach(() => vi.unstubAllGlobals());
  it('adapts controls while retaining bank details when switching back from Card', async () => {
    const payment = reactive<InvoicePayment>({method:'Bank transfer',terms:'Net 30',beneficiary:'Studio',provider:'Bank',account:'UA123',instructions:'Use reference',swift:'SWIFT123'});
    const wrapper = mount(InvoicePaymentFields, { props:{modelValue:payment}, global:{plugins:[PrimeVue]} });
    expect(wrapper.find('#invoice-payment-swift').exists()).toBe(true);
    await wrapper.getComponent(Select).vm.$emit('update:modelValue','Card');
    expect(wrapper.find('#invoice-payment-account').exists()).toBe(false);
    expect(wrapper.find('#invoice-payment-paymentUrl').exists()).toBe(true);
    await wrapper.getComponent(Select).vm.$emit('update:modelValue','Bank transfer');
    expect(wrapper.get('#invoice-payment-account').element).toHaveProperty('value','UA123');
    expect(payment.swift).toBe('SWIFT123');
    expect(payment.terms).toBe('Net 30');
  });
  it('explains an invalid payment link even after its control is hidden', () => {
    const wrapper = mount(InvoicePaymentFields,{props:{modelValue:{method:'Bank transfer',terms:'',beneficiary:'',provider:'',account:'',instructions:'',paymentUrl:'javascript:bad'}},global:{plugins:[PrimeVue]}});
    expect(wrapper.text()).toContain('Switch to Card to correct the payment link.');
  });
});
