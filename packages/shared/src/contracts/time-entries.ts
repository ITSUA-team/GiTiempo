import { z } from 'zod';

import { syncedGitHubIssueSchema } from './github.js';

export const timeEntrySourceSchema = z.enum(['web', 'extension', 'manual']);

const dateTimeSchema = z.iso.datetime();

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === '' ? undefined : value))
  .optional();

const timeEntryProjectSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
});

const timeEntryTaskSummarySchema = z.object({
  id: z.uuid(),
  title: z.string(),
});

const timeEntryWorkspaceSummarySchema = z.object({
  id: z.uuid(),
  name: z.string(),
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
  workspace: timeEntryWorkspaceSummarySchema,
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
      message: 'dateTo must be later than dateFrom',
      path: ['dateTo'],
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
    message: 'endedAt must be later than startedAt',
    path: ['endedAt'],
  });

export const createManualTimeEntryDraftSchema = manualTimeEntryInputBaseSchema
  .omit({ taskId: true })
  .strict()
  .refine(hasPositiveManualTimeEntryDuration, {
    message: 'endedAt must be later than startedAt',
    path: ['endedAt'],
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
      message: 'At least one field must be provided',
      path: [],
    },
  )
  .refine(
    (data) =>
      data.startedAt === undefined ||
      data.endedAt === undefined ||
      new Date(data.endedAt).getTime() > new Date(data.startedAt).getTime(),
    {
      message: 'endedAt must be later than startedAt',
      path: ['endedAt'],
    },
  );

export const startTimerSchema = z
  .object({
    taskId: z.uuid(),
    description: z.string().max(2000).nullable().optional(),
  })
  .strict();

export const stopTimerSchema = z
  .object({
    expectedTimerId: z.uuid().optional(),
  })
  .strict()
  .default({});

export const conditionalStopTimerSchema = z
  .object({
    expectedTimerId: z.uuid(),
  })
  .strict();

export const githubReferenceIssueTitleMaxLength = 500;

const plainIssueTitleSchema = z
  .string()
  .trim()
  .min(1)
  .max(githubReferenceIssueTitleMaxLength)
  .refine(
    (value) =>
      [...value].every((character) => {
        const codePoint = character.charCodeAt(0);
        return codePoint >= 0x20 && codePoint !== 0x7f;
      }),
    {
      message: 'issueTitle must be plain text',
    },
  );

const safePositiveIssueNumberSchema = z
  .number()
  .int()
  .positive()
  .max(Number.MAX_SAFE_INTEGER);

export const startTimerFromGitHubSchema = z
  .object({
    githubProjectId: z.string().min(1).max(255).optional(),
    githubRepo: z
      .string()
      .min(3)
      .max(200)
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    issueNumber: z.number().int().positive(),
  })
  .strict();

/**
 * Validates page context for an external reference start. The URL must already
 * be the canonical direct issue URL; callers cannot submit a board URL, query/
 * hash, or an authority claim for the server to trust.
 */
export const startTimerFromGitHubReferenceSchema = z
  .object({
    githubRepo: z
      .string()
      .min(3)
      .max(200)
      .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
    issueNumber: safePositiveIssueNumberSchema,
    issueTitle: plainIssueTitleSchema,
    issueUrl: z.string().url(),
  })
  .strict()
  .superRefine((input, ctx) => {
    const expectedUrl = `https://github.com/${input.githubRepo}/issues/${input.issueNumber}`;
    if (input.issueUrl !== expectedUrl) {
      ctx.addIssue({
        code: 'custom',
        message:
          'issueUrl must be the canonical URL for githubRepo and issueNumber',
        path: ['issueUrl'],
      });
    }
  });

export const trackingCapabilityResponseSchema = z
  .object({
    canStartTracking: z.boolean(),
    accessScope: z.enum(['project', 'own-time']).nullable(),
    reason: z.string().trim().min(1).max(500).nullable(),
  })
  .strict()
  .superRefine((response, ctx) => {
    if (response.canStartTracking) {
      if (response.accessScope !== null && response.reason === null) return;
      ctx.addIssue({
        code: 'custom',
        message: 'Allowed tracking requires an access scope and no reason',
      });
      return;
    }
    if (response.accessScope === null && response.reason !== null) return;
    ctx.addIssue({
      code: 'custom',
      message: 'Denied tracking requires a reason and no access scope',
    });
  });

export type TimeEntrySource = z.infer<typeof timeEntrySourceSchema>;
export type TimeEntryResponse = z.infer<typeof timeEntryResponseSchema>;
export type TimeEntryListResponse = z.infer<typeof timeEntryListResponseSchema>;
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
export type StopTimerInput = z.infer<typeof stopTimerSchema>;
export type ConditionalStopTimerInput = z.infer<
  typeof conditionalStopTimerSchema
>;
export type StartTimerFromGitHubInput = z.infer<
  typeof startTimerFromGitHubSchema
>;
export type StartTimerFromGitHubReferenceInput = z.infer<
  typeof startTimerFromGitHubReferenceSchema
>;
export type TrackingCapabilityResponse =
  | {
      canStartTracking: true;
      accessScope: 'project' | 'own-time';
      reason: null;
    }
  | {
      canStartTracking: false;
      accessScope: null;
      reason: string;
    };
