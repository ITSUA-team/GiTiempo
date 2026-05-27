import {
  QueryClient,
  VueQueryPlugin,
  type VueQueryPluginOptions,
} from "@tanstack/vue-query";

export function createTestQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      mutations: {
        retry: false,
      },
      queries: {
        refetchOnWindowFocus: false,
        retry: false,
        staleTime: 0,
      },
    },
  });
}

export function createTestQueryPlugin(
  queryClient = createTestQueryClient(),
): [typeof VueQueryPlugin, VueQueryPluginOptions] {
  return [
    VueQueryPlugin,
    { queryClient } satisfies VueQueryPluginOptions,
  ];
}
