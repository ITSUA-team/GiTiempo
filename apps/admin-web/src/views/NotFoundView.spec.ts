import { mount } from '@vue/test-utils';
import { createPinia, setActivePinia } from 'pinia';
import PrimeVue from 'primevue/config';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createMemoryHistory } from 'vue-router';
import { giTiempoPrimeVueOptions } from '@gitiempo/web-config/theme';

import { createAppRouter } from '@/router';

const { hasPriorBrowserHistoryMock } = vi.hoisted(() => ({
  hasPriorBrowserHistoryMock: vi.fn(),
}));

vi.mock('@gitiempo/web-shared/browser-history', () => ({
  hasPriorBrowserHistory: hasPriorBrowserHistoryMock,
}));

async function mountNotFoundView() {
  const pinia = createPinia();
  setActivePinia(pinia);
  const router = createAppRouter({
    history: createMemoryHistory(),
    pinia,
  });
  const NotFoundView = (await import('./NotFoundView.vue')).default;

  return mount(NotFoundView, {
    global: {
      plugins: [pinia, router, [PrimeVue, giTiempoPrimeVueOptions]],
    },
  });
}

describe('NotFoundView', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it('shows the Go back action when browser history exists', async () => {
    hasPriorBrowserHistoryMock.mockReturnValue(true);

    const wrapper = await mountNotFoundView();

    expect(wrapper.text()).toContain('Go back');
  });

  it('omits the Go back action when browser history is empty', async () => {
    hasPriorBrowserHistoryMock.mockReturnValue(false);

    const wrapper = await mountNotFoundView();

    expect(wrapper.text()).not.toContain('Go back');
  });
});
