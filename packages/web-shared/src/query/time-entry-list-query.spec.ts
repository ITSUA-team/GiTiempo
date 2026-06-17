import { describe, expect, it } from "vitest";

import { buildTimeEntryListQueryString } from "./time-entry-list-query";

describe("buildTimeEntryListQueryString", () => {
  it("serializes default pagination when no query is provided", () => {
    expect(buildTimeEntryListQueryString(undefined)).toBe("page=1&limit=20");
  });

  it("serializes the full time-entry list query in stable order", () => {
    expect(
      buildTimeEntryListQueryString({
        dateFrom: "2026-04-01T00:00:00.000Z",
        dateTo: "2026-04-22T00:00:00.000Z",
        limit: 10,
        page: 2,
        projectId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f",
        search: "deploy notes",
        taskId: "018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001",
      }),
    ).toBe(
      "page=2&limit=10&dateFrom=2026-04-01T00%3A00%3A00.000Z&dateTo=2026-04-22T00%3A00%3A00.000Z&projectId=018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9f9f&taskId=018f08cc-7f7f-7f7f-8f8f-9f9f9f9f9001&search=deploy+notes",
    );
  });
});
