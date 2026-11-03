import { flushPromises, mount } from '@vue/test-utils';
import type { InvoiceDefaultsResponse } from '@gitiempo/shared';
import { computed, defineComponent } from 'vue';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createTestQueryPlugin } from '@/test/query-client';

const testMocks = vi.hoisted(() => ({
  getInvoiceDefaults: vi.fn(),
}));

vi.mock('@/services/admin-invoices-client', () => ({
  adminInvoicesClient: {
    getInvoiceDefaults: testMocks.getInvoiceDefaults,
  },
}));

import { useInvoiceDefaults } from './useInvoiceDefaults';

function createInvoiceDefaultsFixture(
  overrides: Partial<InvoiceDefaultsResponse> = {},
): InvoiceDefaultsResponse {
  return {
    currency: 'EUR',
    defaultHourlyRate: 120,
    timeRoundingStepMinutes: 15,
    ...overrides,
  };
}

function composeWithDefaults(options: { enabled?: boolean } = {}) {
  let result!: ReturnType<typeof useInvoiceDefaults>;

  const Harness = defineComponent({
    setup() {
      result = useInvoiceDefaults({
        enabled: options.enabled ?? true,
        scope: computed(() => ({ workspaceId: 'workspace-1' })),
      });
      return () => null;
    },
  });

  mount(Harness, { global: { plugins: [createTestQueryPlugin()] } });
  return result;
}

describe('useInvoiceDefaults', () => {
  beforeEach(() => {
    testMocks.getInvoiceDefaults.mockReset();
    testMocks.getInvoiceDefaults.mockResolvedValue(
      createInvoiceDefaultsFixture(),
    );
  });

  it('exposes null workspace values while loading, then the loaded defaults', async () => {
    const defaults = composeWithDefaults();

    expect(defaults.workspaceCurrency.value).toBeNull();
    expect(defaults.workspaceHourlyRate.value).toBeNull();
    expect(defaults.workspaceRoundingStepMinutes.value).toBeNull();

    await flushPromises();

    expect(defaults.workspaceCurrency.value).toBe('EUR');
    expect(defaults.workspaceHourlyRate.value).toBe(120);
    expect(defaults.workspaceRoundingStepMinutes.value).toBe(15);
  });

  it('maps nullable currency and rate to null until defaults arrive', async () => {
    testMocks.getInvoiceDefaults.mockResolvedValue(
      createInvoiceDefaultsFixture({
        currency: null,
        defaultHourlyRate: null,
      }),
    );

    const defaults = composeWithDefaults();
    await flushPromises();

    expect(defaults.workspaceCurrency.value).toBeNull();
    expect(defaults.workspaceHourlyRate.value).toBeNull();
    // The rounding step always has a workspace-level value.
    expect(defaults.workspaceRoundingStepMinutes.value).toBe(15);
  });

  it('does not fetch when disabled', async () => {
    composeWithDefaults({ enabled: false });

    await flushPromises();

    expect(testMocks.getInvoiceDefaults).not.toHaveBeenCalled();
  });

  it('keeps the query error on the returned query for view-level handling', async () => {
    const defaultsError = new Error('Defaults unavailable');
    testMocks.getInvoiceDefaults.mockRejectedValueOnce(defaultsError);

    const defaults = composeWithDefaults();
    await flushPromises();

    expect(defaults.invoiceDefaultsQuery.error.value).toBe(defaultsError);
    expect(defaults.workspaceCurrency.value).toBeNull();
    expect(defaults.workspaceRoundingStepMinutes.value).toBeNull();
  });
});