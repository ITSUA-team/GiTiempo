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
        retry: false,
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
