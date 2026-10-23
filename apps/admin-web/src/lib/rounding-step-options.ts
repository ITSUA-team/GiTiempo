export interface RoundingStepOption {
  label: string;
  value: number;
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

/**
 * Sentinel value PrimeVue Select can match as a selected option.
 * `null` does not render as a selected option in PrimeVue Select,
 * so the form uses 0 internally and converts to null at the submit boundary.
 */
export const INHERIT_ROUNDING_STEP_SENTINEL = 0;

export function getInheritRoundingStepOption(
  workspaceRoundingStepMinutes: number,
): RoundingStepOption {
  return {
    label: `Inherit from workspace (${workspaceRoundingStepMinutes} min)`,
    value: INHERIT_ROUNDING_STEP_SENTINEL,
  };
}

export function toFormRoundingStepMinutes(
  value: number | null | undefined,
): number {
  return value ?? INHERIT_ROUNDING_STEP_SENTINEL;
}

export function toApiRoundingStepMinutes(
  value: number | null | undefined,
): number | null {
  return value === INHERIT_ROUNDING_STEP_SENTINEL ? null : (value ?? null);
}
