import { QueryClient, type VueQueryPluginOptions } from "@tanstack/vue-query";

export function createAppQueryClient(): QueryClient {
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

export const queryClient = createAppQueryClient();

export const vueQueryPluginOptions: VueQueryPluginOptions = {
  queryClient,
};
