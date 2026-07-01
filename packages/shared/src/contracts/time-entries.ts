import { z } from "zod";

import { syncedGitHubIssueSchema } from "./github.js";

export const timeEntrySourceSchema = z.enum(["web", "extension", "manual"]);

const dateTimeSchema = z.iso.datetime();

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const timeEntryProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const timeEntryTaskSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

const timeEntryUserSummarySchema = z.object({
  id: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
});

export const timeEntryResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  taskId: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  startedAt: dateTimeSchema,
  endedAt: dateTimeSchema.nullable(),
  durationSeconds: z.number().int().positive().nullable(),
  description: z.string().nullable(),
  isBillable: z.boolean(),
  source: timeEntrySourceSchema,
  createdAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
  project: timeEntryProjectSummarySchema,
  task: timeEntryTaskSummarySchema,
  user: timeEntryUserSummarySchema,
  githubIssue: syncedGitHubIssueSchema.nullable(),
});

export const timeEntryListMetaSchema = z.object({
  page: z.number().int().min(1),
  limit: z.number().int().min(1).max(100),
  total: z.number().int().min(0),
  totalPages: z.number().int().min(0),
});

export const timeEntryListResponseSchema = z.object({
  items: z.array(timeEntryResponseSchema),
  meta: timeEntryListMetaSchema,
});

export const currentTimeEntryResponseSchema = z.object({
  timeEntry: timeEntryResponseSchema.nullable(),
});

export const timeEntryListQuerySchema = z
  .object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    dateFrom: dateTimeSchema.optional(),
    dateTo: dateTimeSchema.optional(),
    projectId: z.uuid().optional(),
    taskId: z.uuid().optional(),
    search: optionalSearchSchema,
  })
  .strict()
  .refine(
    (data) =>
      data.dateFrom === undefined ||
      data.dateTo === undefined ||
      new Date(data.dateTo).getTime() > new Date(data.dateFrom).getTime(),
    {
      message: "dateTo must be later than dateFrom",
      path: ["dateTo"],
    },
  );

const manualTimeEntryInputBaseSchema = z
  .object({
    taskId: z.uuid(),
    startedAt: dateTimeSchema,
    endedAt: dateTimeSchema,
    description: z.string().max(2000).nullable().optional(),
    isBillable: z.boolean().optional(),
  })
  .strict();

function hasPositiveManualTimeEntryDuration(data: {
  endedAt: string;
  startedAt: string;
}): boolean {
  return new Date(data.endedAt).getTime() > new Date(data.startedAt).getTime();
}

export const createManualTimeEntrySchema = manualTimeEntryInputBaseSchema
  .strict()
  .refine(hasPositiveManualTimeEntryDuration, {
    message: "endedAt must be later than startedAt",
    path: ["endedAt"],
  });

export const createManualTimeEntryDraftSchema = manualTimeEntryInputBaseSchema
  .omit({ taskId: true })
  .strict()
  .refine(hasPositiveManualTimeEntryDuration, {
    message: "endedAt must be later than startedAt",
    path: ["endedAt"],
  });

export const updateTimeEntrySchema = z
  .object({
    taskId: z.uuid().optional(),
    startedAt: dateTimeSchema.optional(),
    endedAt: dateTimeSchema.optional(),
    description: z.string().max(2000).nullable().optional(),
    isBillable: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.taskId !== undefined ||
      data.startedAt !== undefined ||
      data.endedAt !== undefined ||
      data.description !== undefined ||
      data.isBillable !== undefined,
    {
      message: "At least one field must be provided",
      path: [],
    },
  )
  .refine(
    (data) =>
      data.startedAt === undefined ||
      data.endedAt === undefined ||
      new Date(data.endedAt).getTime() > new Date(data.startedAt).getTime(),
    {
      message: "endedAt must be later than startedAt",
      path: ["endedAt"],
    },
  );

export const startTimerSchema = z
  .object({
    taskId: z.uuid(),
    description: z.string().max(2000).nullable().optional(),
  })
  .strict();

export const startTimerFromGitHubSchema = z
  .object({
    githubRepo: z
      .string()
      .min(3)
      .max(200)
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    issueNumber: z.number().int().positive(),
    issueTitle: z.string().min(1).max(500),
  })
  .strict();

export type TimeEntrySource = z.infer<typeof timeEntrySourceSchema>;
export type TimeEntryResponse = z.infer<typeof timeEntryResponseSchema>;
export type TimeEntryListResponse = z.infer<
  typeof timeEntryListResponseSchema
>;
export type CurrentTimeEntryResponse = z.infer<
  typeof currentTimeEntryResponseSchema
>;
export type TimeEntryListQuery = z.infer<typeof timeEntryListQuerySchema>;
export type CreateManualTimeEntryInput = z.infer<
  typeof createManualTimeEntrySchema
>;
export type CreateManualTimeEntryDraftInput = z.infer<
  typeof createManualTimeEntryDraftSchema
>;
export type UpdateTimeEntryInput = z.infer<typeof updateTimeEntrySchema>;
export type StartTimerInput = z.infer<typeof startTimerSchema>;
export type StartTimerFromGitHubInput = z.infer<
  typeof startTimerFromGitHubSchema
>;
