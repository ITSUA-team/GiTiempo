// @vitest-environment jsdom

import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import { defineComponent, h } from "vue";
import { useQuery, useQueryClient } from "@tanstack/vue-query";

import { createTestQueryClient, createTestQueryPlugin } from "./query-client";

const QueryProbe = defineComponent({
  name: "QueryProbe",
  setup() {
    const queryClient = useQueryClient();
    const query = useQuery({
      queryFn: async () => "ready",
      queryKey: ["query-smoke"],
    });

    return () =>
      h(
        "div",
        { "data-testid": "query-probe" },
        `${queryClient ? "client" : "missing"}:${query.data.value ?? "pending"}`,
      );
  },
});

describe("test QueryClient helper", () => {
  it("provides an isolated QueryClient with retries disabled", async () => {
    const queryClient = createTestQueryClient();

    const wrapper = mount(QueryProbe, {
      global: {
        plugins: [createTestQueryPlugin(queryClient)],
      },
    });

    await flushPromises();

    expect(queryClient.getDefaultOptions().queries?.retry).toBe(false);
    expect(wrapper.get('[data-testid="query-probe"]').text()).toBe(
      "client:ready",
    );
  });
});
