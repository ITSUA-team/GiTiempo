export interface RoundingStepOption {
  label: string;
  value: number | null;
}

/** Must stay aligned with `roundingStepMinutesSchema` (1–60, integer). */
export const ROUNDING_STEP_MINUTES_PRESETS: readonly number[] = [
  1, 5, 10, 15, 30, 60,
];

export function getRoundingStepOptions(): RoundingStepOption[] {
  return ROUNDING_STEP_MINUTES_PRESETS.map((stepMinutes) => ({
    label: `${stepMinutes} min`,
    value: stepMinutes,
  }));
}

export function getInheritRoundingStepOption(
  workspaceRoundingStepMinutes: number,
): RoundingStepOption {
  return {
    label: `Inherit from workspace (${workspaceRoundingStepMinutes} min)`,
    value: null,
  };
}
