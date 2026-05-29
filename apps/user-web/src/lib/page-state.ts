export type DataPageState = "loading" | "request-error" | "empty" | "ready";

export interface DataPageStateInput {
  hasRequestError: boolean;
  isEmpty: boolean;
  isLoading: boolean;
}

const DATA_PAGE_STATE_RULES = [
  {
    matches: (input: DataPageStateInput) => input.isLoading,
    state: "loading",
  },
  {
    matches: (input: DataPageStateInput) => input.hasRequestError,
    state: "request-error",
  },
  {
    matches: (input: DataPageStateInput) => input.isEmpty,
    state: "empty",
  },
] as const;

export function resolveDataPageState(input: DataPageStateInput): DataPageState {
  return DATA_PAGE_STATE_RULES.find((rule) => rule.matches(input))?.state ?? "ready";
}
