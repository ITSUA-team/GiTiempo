import { onBeforeUnmount, ref } from 'vue';

const MOBILE_VIEWPORT_QUERY = '(max-width: 639px)';

export function useIsMobileViewport() {
  const isMobileViewport = ref(false);

  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
    return isMobileViewport;
  }

  const mediaQueryList = window.matchMedia(MOBILE_VIEWPORT_QUERY);

  const updateViewport = (matches: boolean): void => {
    isMobileViewport.value = matches;
  };

  updateViewport(mediaQueryList.matches);

  const handleChange = (event: MediaQueryListEvent): void => {
    updateViewport(event.matches);
  };

  if (typeof mediaQueryList.addEventListener === 'function') {
    mediaQueryList.addEventListener('change', handleChange);

    onBeforeUnmount(() => {
      mediaQueryList.removeEventListener('change', handleChange);
    });

    return isMobileViewport;
  }

  mediaQueryList.addListener(handleChange);

  onBeforeUnmount(() => {
    mediaQueryList.removeListener(handleChange);
  });

  return isMobileViewport;
}
