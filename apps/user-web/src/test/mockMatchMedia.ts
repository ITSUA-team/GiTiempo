import { vi } from 'vitest';

type MatchMediaListener = (event: MediaQueryListEvent) => void;

export function mockMatchMedia(matches = false) {
  const changeListeners = new Set<MatchMediaListener>();
  let currentMatches = matches;

  const mediaQueryList = {
    addEventListener: vi.fn((event: string, listener: MatchMediaListener) => {
      if (event === 'change') {
        changeListeners.add(listener);
      }
    }),
    addListener: vi.fn((listener: MatchMediaListener) => {
      changeListeners.add(listener);
    }),
    dispatchEvent: vi.fn(),
    get matches() {
      return currentMatches;
    },
    media: '',
    onchange: null as ((event: MediaQueryListEvent) => void) | null,
    removeEventListener: vi.fn((event: string, listener: MatchMediaListener) => {
      if (event === 'change') {
        changeListeners.delete(listener);
      }
    }),
    removeListener: vi.fn((listener: MatchMediaListener) => {
      changeListeners.delete(listener);
    }),
  };

  const matchMedia = vi.fn().mockImplementation((query: string) => {
    mediaQueryList.media = query;

    return mediaQueryList;
  });

  Object.defineProperty(window, 'matchMedia', {
    configurable: true,
    value: matchMedia,
  });

  return {
    matchMedia,
    mediaQueryList,
    setMatches(nextMatches: boolean): void {
      currentMatches = nextMatches;

      const event = { matches: nextMatches } as MediaQueryListEvent;

      for (const listener of changeListeners) {
        listener(event);
      }

      mediaQueryList.onchange?.(event);
    },
  };
}
