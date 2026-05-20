// @vitest-environment jsdom

import { mount } from '@vue/test-utils';
import { defineComponent, h, nextTick } from 'vue';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useIsMobileViewport } from './viewport';

// eslint-disable-next-line no-unused-vars
type MatchMediaChangeHandler = (event: MediaQueryListEvent) => void;
type MatchMediaListener = MatchMediaChangeHandler;
type MockMediaQueryList = {
  addEventListener?: ReturnType<typeof vi.fn>;
  addListener: ReturnType<typeof vi.fn>;
  dispatchEvent: ReturnType<typeof vi.fn>;
  matches: boolean;
  media: string;
  onchange: MatchMediaChangeHandler | null;
  removeEventListener?: ReturnType<typeof vi.fn>;
  removeListener: ReturnType<typeof vi.fn>;
};

function createProbeComponent() {
  return defineComponent({
    setup() {
      const isMobileViewport = useIsMobileViewport();

      return () =>
        h('div', {
          'data-mobile': String(isMobileViewport.value),
        });
    },
  });
}

function installMatchMedia(matches = false, legacy = false) {
  const listeners = new Set<MatchMediaListener>();
  const mediaQueryList: MockMediaQueryList = {
    addListener: vi.fn((listener: MatchMediaListener) => {
      listeners.add(listener);
    }),
    dispatchEvent: vi.fn(),
    matches,
    media: '',
    onchange: null as MatchMediaChangeHandler | null,
    removeListener: vi.fn((listener: MatchMediaListener) => {
      listeners.delete(listener);
    }),
  };

  if (!legacy) {
    mediaQueryList.addEventListener = vi.fn((event: string, listener: MatchMediaListener) => {
      if (event === 'change') {
        listeners.add(listener);
      }
    });
    mediaQueryList.removeEventListener = vi.fn((event: string, listener: MatchMediaListener) => {
      if (event === 'change') {
        listeners.delete(listener);
      }
    });
  }

  const matchMedia = vi.fn().mockImplementation((query: string) => {
    mediaQueryList.media = query;

    return mediaQueryList as unknown as MediaQueryList;
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });

  return {
    matchMedia,
    mediaQueryList,
    setMatches(nextMatches: boolean) {
      mediaQueryList.matches = nextMatches;

      const event = { matches: nextMatches } as MediaQueryListEvent;

      for (const listener of listeners) {
        listener(event);
      }

      mediaQueryList.onchange?.(event);
    },
  };
}

describe('useIsMobileViewport', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'matchMedia');
    vi.restoreAllMocks();
  });

  it('uses the shared mobile breakpoint and reacts to matchMedia change events', async () => {
    const controller = installMatchMedia(false);
    const wrapper = mount(createProbeComponent());

    expect(controller.matchMedia).toHaveBeenCalledWith('(max-width: 639px)');
    expect(wrapper.attributes('data-mobile')).toBe('false');

    controller.setMatches(true);
    await nextTick();

    expect(wrapper.attributes('data-mobile')).toBe('true');

    wrapper.unmount();

    expect(controller.mediaQueryList.removeEventListener).toHaveBeenCalledWith(
      'change',
      expect.any(Function),
    );
  });

  it('falls back to the legacy listener API when addEventListener is unavailable', async () => {
    const controller = installMatchMedia(true, true);
    const wrapper = mount(createProbeComponent());

    expect(wrapper.attributes('data-mobile')).toBe('true');

    controller.setMatches(false);
    await nextTick();

    expect(wrapper.attributes('data-mobile')).toBe('false');

    wrapper.unmount();

    expect(controller.mediaQueryList.removeListener).toHaveBeenCalledWith(expect.any(Function));
  });

  it('returns a safe non-mobile fallback when matchMedia is unavailable', () => {
    Reflect.deleteProperty(window, 'matchMedia');

    const wrapper = mount(createProbeComponent());

    expect(wrapper.attributes('data-mobile')).toBe('false');
  });
});
