import { z } from 'zod';
import { roundingStepMinutesSchema } from './common.js';
import { githubRepoKeySchema } from './github.js';
import { workspaceRoleSchema } from './workspace-members.js';

export const projectVisibilitySchema = z.enum(['public', 'private']);
export const projectSourceSchema = z.enum(['manual', 'github']);
export const projectTrackingModeSchema = z.enum([
  'managed',
  'external-reference',
]);
export const referenceProvenanceSchema = z.enum([
  'provider-verified',
  'user-supplied',
]);
export const projectAccessScopeSchema = z.enum(['project', 'own-time']);

/** Server-computed permissions for operations against a project. */
export const projectCapabilitiesSchema = z.object({
  canManageTasks: z.boolean(),
});

const projectDescriptionSchema = z.string().max(2000).nullable();

export const projectMemberSchema = z.object({
  userId: z.uuid(),
  displayName: z.string().nullable(),
  email: z.email(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
});

function addOwnTimeProjectResponseIssues(
  data: {
    accessScope: ProjectAccessScope;
    capabilities: ProjectCapabilities;
    members: ProjectMember[];
  },
  ctx: z.RefinementCtx,
): void {
  if (data.accessScope !== 'own-time') return;

  if (data.capabilities.canManageTasks) {
    ctx.addIssue({
      code: 'custom',
      message: 'Own-time access cannot manage tasks',
      path: ['capabilities', 'canManageTasks'],
    });
  }

  if (data.members.length > 0) {
    ctx.addIssue({
      code: 'custom',
      message: 'Own-time access cannot include project members',
      path: ['members'],
    });
  }
}

export const projectResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  name: z.string(),
  description: projectDescriptionSchema,
  color: z.string().nullable(),
  visibility: projectVisibilitySchema,
  defaultBillableForTasks: z.boolean(),
  timeRoundingStepMinutes: roundingStepMinutesSchema.nullable(),
  source: projectSourceSchema,
  trackingMode: projectTrackingModeSchema,
  referenceProvenance: referenceProvenanceSchema.nullable(),
  accessScope: projectAccessScopeSchema,
  capabilities: projectCapabilitiesSchema,
  totalSeconds: z.number().int().min(0),
  members: z.array(projectMemberSchema),
  isActive: z.boolean(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
}).superRefine(addOwnTimeProjectResponseIssues);

export const projectListResponseSchema = z.array(projectResponseSchema);

export const projectProviderSummarySchema = z.object({
  source: projectSourceSchema,
  externalType: z.string().nullable(),
  externalKey: z.string().nullable(),
  externalUrl: z.string().nullable(),
});

export const projectTrackedSummarySchema = z.object({
  totalSeconds: z.number().int().min(0),
  billableSeconds: z.number().int().min(0),
  billableShare: z.number().min(0).max(1).nullable(),
  lastActivityAt: z.iso.datetime().nullable(),
});

export const projectAssignedMembersSummarySchema = z.object({
  count: z.number().int().min(0),
  previewMembers: z.array(projectMemberSchema).max(3),
  remainingCount: z.number().int().min(0),
});

export const projectDetailResponseSchema = projectResponseSchema.extend({
  providerSummary: projectProviderSummarySchema,
  trackedSummary: projectTrackedSummarySchema,
  assignedMembersSummary: projectAssignedMembersSummarySchema.nullable(),
}).superRefine((data, ctx) => {
  if (
    data.accessScope === 'own-time' &&
    data.assignedMembersSummary !== null
  ) {
    ctx.addIssue({
      code: 'custom',
      message: 'Own-time access cannot include assigned member summaries',
      path: ['assignedMembersSummary'],
    });
  }
});

export const managementProjectSummaryResponseSchema = z.object({
  activeProjects: z.number().int().min(0),
  privateProjects: z.number().int().min(0),
  publicProjects: z.number().int().min(0),
});

export const myProjectSummaryResponseSchema = z.object({
  visibleProjects: z.number().int().min(0),
  trackedHoursWeek: z.number().min(0),
  trackedHoursMonth: z.number().min(0),
});

export const createProjectSchema = z
  .object({
    name: z.string().min(1).max(255),
    description: projectDescriptionSchema.optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    visibility: projectVisibilitySchema.optional(),
    defaultBillableForTasks: z.boolean().optional(),
    timeRoundingStepMinutes: roundingStepMinutesSchema.nullable().optional(),
  })
  .strict();

export const updateProjectSchema = z
  .object({
    name: z.string().min(1).max(255).optional(),
    description: projectDescriptionSchema.optional(),
    color: z
      .string()
      .regex(/^#[0-9A-Fa-f]{6}$/)
      .nullable()
      .optional(),
    visibility: projectVisibilitySchema.optional(),
    defaultBillableForTasks: z.boolean().optional(),
    isActive: z.boolean().optional(),
    timeRoundingStepMinutes: roundingStepMinutesSchema.nullable().optional(),
  })
  .strict()
  .refine(
    (data) =>
      data.name !== undefined ||
      data.description !== undefined ||
      data.color !== undefined ||
      data.visibility !== undefined ||
      data.defaultBillableForTasks !== undefined ||
      data.isActive !== undefined ||
      data.timeRoundingStepMinutes !== undefined,
    {
      message: 'At least one field must be provided',
      path: [],
    },
  );

export const backfillProjectBillableDefaultSchema = z
  .object({
    updateTasks: z.boolean().optional(),
    updateTimeEntries: z.boolean().optional(),
  })
  .strict()
  .refine(
    (data) => data.updateTasks === true || data.updateTimeEntries === true,
    {
      message: 'At least one existing record type must be selected',
      path: [],
    },
  );

export const projectBillableDefaultBackfillResponseSchema = z.object({
  tasksUpdated: z.number().int().min(0),
  timeEntriesUpdated: z.number().int().min(0),
});

export const projectAssignmentResponseSchema = z.object({
  id: z.uuid(),
  workspaceId: z.uuid(),
  projectId: z.uuid(),
  userId: z.uuid(),
  email: z.email(),
  displayName: z.string().nullable(),
  avatarUrl: z.string().nullable(),
  role: workspaceRoleSchema,
  assignedBy: z.uuid(),
  assignedAt: z.iso.datetime(),
});

export const projectAssignmentListResponseSchema = z.array(
  projectAssignmentResponseSchema,
);

export const importGitHubRepositoriesSchema = z
  .object({
    githubRepos: z.array(githubRepoKeySchema).min(1).max(50),
  })
  .strict();

export const importGitHubProjectsSchema = z
  .object({
    githubProjects: z
      .array(
        z
          .object({
            defaultBillableForTasks: z.boolean().optional(),
            githubProjectId: z.string().min(1).max(255),
            githubRepos: z.array(githubRepoKeySchema).max(25).default([]),
            visibility: projectVisibilitySchema.optional(),
          })
          .strict(),
      )
      .min(1)
      .max(25),
  })
  .strict();

export const trackingProjectSchema = z.object({
  id: z.uuid(),
  isActive: z.boolean(),
  name: z.string(),
});

export const importedGitHubProjectSchema = z.object({
  githubProjectId: z.string(),
  linkedRepository: z.string().nullable(),
  projectId: z.uuid().nullable(),
  status: z.enum([
    'imported',
    'already-imported',
    'repository-taken',
    'name-taken',
    'failed',
  ]),
  message: z.string().nullable(),
  trackingProject: trackingProjectSchema.nullable().default(null),
});

export const importGitHubProjectsResponseSchema = z.object({
  results: z.array(importedGitHubProjectSchema),
});

export const projectGitHubProjectListResponseSchema = z.object({
  items: z.array(
    z.object({
      githubProjectId: z.string(),
      linkedRepository: z.string().nullable(),
      projectId: z.uuid(),
      projectIsActive: z.boolean(),
    }),
  ),
});

export const importedGitHubRepositorySchema = z.object({
  githubRepo: z.string(),
  projectId: z.uuid().nullable(),
  status: z.enum(['imported', 'already-imported', 'failed']),
  message: z.string().nullable(),
});

export const importGitHubRepositoriesResponseSchema = z.object({
  results: z.array(importedGitHubRepositorySchema),
});

export const projectGitHubRepositoryListResponseSchema = z.object({
  items: z.array(
    z.object({
      githubRepo: z.string(),
      projectId: z.uuid(),
      projectIsActive: z.boolean(),
      projectName: z.string().default(''),
    }),
  ),
});

export const createProjectAssignmentSchema = z
  .object({
    userId: z.uuid(),
  })
  .strict();

export type ProjectMember = z.infer<typeof projectMemberSchema>;
export type ProjectResponse = z.infer<typeof projectResponseSchema>;
export type ProjectListResponse = z.infer<typeof projectListResponseSchema>;
export type ProjectProviderSummary = z.infer<
  typeof projectProviderSummarySchema
>;
export type ProjectTrackedSummary = z.infer<typeof projectTrackedSummarySchema>;
export type ProjectAssignedMembersSummary = z.infer<
  typeof projectAssignedMembersSummarySchema
>;
export type ProjectDetailResponse = z.infer<typeof projectDetailResponseSchema>;
export type ProjectVisibility = z.infer<typeof projectVisibilitySchema>;
export type ProjectSource = z.infer<typeof projectSourceSchema>;
export type ProjectTrackingMode = z.infer<typeof projectTrackingModeSchema>;
export type ReferenceProvenance = z.infer<typeof referenceProvenanceSchema>;
export type ProjectAccessScope = z.infer<typeof projectAccessScopeSchema>;
export type ProjectCapabilities = z.infer<typeof projectCapabilitiesSchema>;
export type ManagementProjectSummaryResponse = z.infer<
  typeof managementProjectSummaryResponseSchema
>;
export type MyProjectSummaryResponse = z.infer<
  typeof myProjectSummaryResponseSchema
>;
export type CreateProjectInput = z.infer<typeof createProjectSchema>;
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;
export type BackfillProjectBillableDefaultInput = z.infer<
  typeof backfillProjectBillableDefaultSchema
>;
export type ProjectBillableDefaultBackfillResponse = z.infer<
  typeof projectBillableDefaultBackfillResponseSchema
>;
export type ProjectAssignmentResponse = z.infer<
  typeof projectAssignmentResponseSchema
>;
export type ProjectAssignmentListResponse = z.infer<
  typeof projectAssignmentListResponseSchema
>;
export type CreateProjectAssignmentInput = z.infer<
  typeof createProjectAssignmentSchema
>;
export type ImportGitHubRepositoriesInput = z.infer<
  typeof importGitHubRepositoriesSchema
>;
export type ImportedGitHubRepository = z.infer<
  typeof importedGitHubRepositorySchema
>;
export type ImportGitHubRepositoriesResponse = z.infer<
  typeof importGitHubRepositoriesResponseSchema
>;
export type ProjectGitHubRepositoryListResponse = z.infer<
  typeof projectGitHubRepositoryListResponseSchema
>;
export type ImportGitHubProjectsInput = z.infer<
  typeof importGitHubProjectsSchema
>;
export type TrackingProject = z.infer<typeof trackingProjectSchema>;
export type ImportedGitHubProject = z.infer<typeof importedGitHubProjectSchema>;
export type ImportGitHubProjectsResponse = z.infer<
  typeof importGitHubProjectsResponseSchema
>;
export type ProjectGitHubProjectListResponse = z.infer<
  typeof projectGitHubProjectListResponseSchema
>;
