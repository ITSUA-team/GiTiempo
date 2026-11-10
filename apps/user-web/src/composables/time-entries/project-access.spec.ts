import type { ProjectResponse } from "@gitiempo/shared";
import { describe, expect, it } from "vitest";

import { getRemovedProjectIds } from "./project-access";

function createProject(id: string, isActive = true): ProjectResponse {
  return { id, isActive } as ProjectResponse;
}

describe("getRemovedProjectIds", () => {
  it("only marks projects that disappeared, preserving inactive historical projects", () => {
    expect(
      getRemovedProjectIds(
        [createProject("active"), createProject("inactive", false)],
        [createProject("inactive", false)],
      ),
    ).toEqual(new Set(["active"]));
  });
});
