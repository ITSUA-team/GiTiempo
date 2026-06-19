import { z } from "zod";

const timeZoneNamePattern = /^(?:UTC|[A-Za-z_]+(?:\/[A-Za-z0-9_+.-]+)+)$/;
const fallbackTimeZones = new Set([
  "UTC",
  "Africa/Cairo",
  "Africa/Johannesburg",
  "America/Argentina/Buenos_Aires",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "America/Mexico_City",
  "America/New_York",
  "America/Sao_Paulo",
  "America/Toronto",
  "Asia/Dubai",
  "Asia/Hong_Kong",
  "Asia/Jakarta",
  "Asia/Jerusalem",
  "Asia/Kolkata",
  "Asia/Seoul",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Australia/Melbourne",
  "Australia/Sydney",
  "Europe/Amsterdam",
  "Europe/Berlin",
  "Europe/Kyiv",
  "Europe/London",
  "Europe/Madrid",
  "Europe/Paris",
  "Europe/Rome",
  "Europe/Stockholm",
  "Europe/Warsaw",
]);

function getRuntimeTimeZones(): Set<string> | null {
  const supportedValuesOf = Intl.supportedValuesOf;

  if (typeof supportedValuesOf !== "function") return null;

  try {
    const values = supportedValuesOf("timeZone");

    return values.length > 0 ? new Set(values) : null;
  } catch {
    return null;
  }
}

const runtimeTimeZones = getRuntimeTimeZones();

function isValidTimeZone(timeZone: string): boolean {
  if (!timeZoneNamePattern.test(timeZone)) return false;
  if (timeZone === "UTC") return true;

  return runtimeTimeZones?.has(timeZone) === true || fallbackTimeZones.has(timeZone);
}

const timeZoneSchema = z
  .string()
  .min(1)
  .max(64)
  .refine(isValidTimeZone, { message: "Invalid time zone" });

export const workspaceResponseSchema = z.object({
  id: z.uuid(),
  name: z.string(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const updateWorkspaceSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
  })
  .strict()
  .refine((data) => data.name !== undefined, {
    message: "At least one field must be provided",
    path: [],
  });

export const workspaceSettingsResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  currency: z.string().length(3),
  defaultHourlyRate: z.number().nonnegative().nullable(),
  timeZone: timeZoneSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

export const updateWorkspaceSettingsSchema = z
  .object({
    currency: z.string().regex(/^[A-Z]{3}$/).optional(),
    defaultHourlyRate: z.number().nonnegative().nullable().optional(),
    timeZone: timeZoneSchema.optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.currency !== undefined ||
      data.defaultHourlyRate !== undefined ||
      data.timeZone !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  );

export type WorkspaceResponse = z.infer<typeof workspaceResponseSchema>;
export type UpdateWorkspaceInput = z.infer<typeof updateWorkspaceSchema>;
export type WorkspaceSettingsResponse = z.infer<
  typeof workspaceSettingsResponseSchema
>;
export type UpdateWorkspaceSettingsInput = z.infer<
  typeof updateWorkspaceSettingsSchema
>;
