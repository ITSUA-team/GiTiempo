import { z } from "zod";

const dateTimeSchema = z.iso.datetime();
const githubUrlSchema = z.url();

const optionalSearchSchema = z
  .string()
  .trim()
  .max(200)
  .transform((value) => (value === "" ? undefined : value))
  .optional();

const pageTokenSchema = z.string().min(1).max(2000);

const githubBrowsingQueryBaseSchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).default(30),
  pageToken: pageTokenSchema.optional(),
});

const githubOwnerScopedQueryBaseSchema = githubBrowsingQueryBaseSchema
  .extend({
    ownerType: z.enum(["personal", "organization"]),
    owner: z.string().min(1).max(255).optional(),
  })
  .strict()
  .superRefine((data, ctx) => {
    if (data.ownerType === "organization" && data.owner === undefined) {
      ctx.addIssue({
        code: "custom",
        message: "owner is required for organization scope",
        path: ["owner"],
      });
    }
    if (data.ownerType === "personal" && data.owner !== undefined) {
      ctx.addIssue({
        code: "custom",
        message: "owner is only accepted for organization scope",
        path: ["owner"],
      });
    }
  });

export const githubConnectionAccountSchema = z.object({
  githubUserId: z.string().min(1),
  login: z.string().min(1),
  avatarUrl: z.string().nullable(),
  connectedAt: dateTimeSchema,
  updatedAt: dateTimeSchema,
});

export const githubConnectionStatusResponseSchema = z.discriminatedUnion(
  "status",
  [
    z.object({
      status: z.literal("disconnected"),
      account: z.null(),
    }),
    z.object({
      status: z.literal("connected"),
      account: githubConnectionAccountSchema,
    }),
  ],
);

export const githubAuthUrlResponseSchema = z.object({
  authorizationUrl: z.url(),
});

export const githubOwnerTypeSchema = z.enum([
  "all",
  "personal",
  "organization",
]);

export const githubOwnerScopeSchema = z.enum(["personal", "organization"]);

export const githubIssueStateSchema = z.enum(["open", "closed", "all"]);

export const syncedGitHubIssueSchema = z.object({
  githubRepo: z
    .string()
    .min(3)
    .max(200)
    .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/),
  issueNumber: z.number().int().positive(),
});

const githubRepositoryKeySchema = z
  .string()
  .min(3)
  .max(200)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);

const githubIssueExternalKeySchema = z
  .string()
  .min(5)
  .max(250)
  .regex(/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+#[1-9]\d*$/);

const githubRepositoryCreateReferenceMetadataSchema = z
  .object({
    description: z.string().max(1000).nullable().optional(),
    fullName: githubRepositoryKeySchema.optional(),
    isArchived: z.boolean().optional(),
    name: z.string().min(1).max(255).optional(),
    nodeId: z.string().min(1).max(255).nullable().optional(),
    owner: z.string().min(1).max(255).optional(),
    updatedAt: dateTimeSchema.optional(),
    visibility: z.enum(["public", "private", "internal"]).optional(),
  })
  .strict();

const githubProjectV2CreateReferenceMetadataSchema = z
  .object({
    description: z.string().max(2000).nullable().optional(),
    number: z.number().int().min(1).optional(),
    owner: z.string().min(1).max(255).optional(),
    state: z.enum(["open", "closed"]).optional(),
    title: z.string().min(1).max(255).optional(),
    updatedAt: dateTimeSchema.optional(),
  })
  .strict();

const githubIssueCreateReferenceMetadataSchema = z
  .object({
    nodeId: z.string().min(1).max(255).nullable().optional(),
    number: z.number().int().min(1).optional(),
    projectId: z.string().min(1).max(255).nullable().optional(),
    repository: githubRepositoryKeySchema.optional(),
    state: z.enum(["open", "closed"]).optional(),
    title: z.string().min(1).max(500).optional(),
    updatedAt: dateTimeSchema.optional(),
  })
  .strict();

const githubCreateReferenceBaseSchema = z.object({
  provider: z.literal("github"),
  externalId: z.string().min(1).max(255).nullable().optional(),
  externalKey: z.string().min(1).max(500),
  externalUrl: githubUrlSchema.nullable(),
});

export const githubProjectRepositoryCreateReferenceSchema =
  githubCreateReferenceBaseSchema
    .extend({
      externalType: z.literal("repository"),
      externalKey: githubRepositoryKeySchema,
      externalUrl: githubUrlSchema,
      metadata: githubRepositoryCreateReferenceMetadataSchema.optional(),
    })
    .strict();

export const githubProjectV2CreateReferenceSchema =
  githubCreateReferenceBaseSchema
    .extend({
      externalType: z.literal("project_v2"),
      metadata: githubProjectV2CreateReferenceMetadataSchema.optional(),
    })
    .strict();

export const githubProjectCreateReferenceSchema = z.discriminatedUnion(
  "externalType",
  [
    githubProjectRepositoryCreateReferenceSchema,
    githubProjectV2CreateReferenceSchema,
  ],
);

export const githubRepositoryIssueCreateReferenceSchema =
  githubCreateReferenceBaseSchema
    .extend({
      sourceType: z.literal("repository_issue"),
      externalType: z.literal("issue"),
      externalKey: githubIssueExternalKeySchema,
      externalUrl: githubUrlSchema,
      metadata: githubIssueCreateReferenceMetadataSchema.optional(),
    })
    .strict();

export const githubProjectV2IssueItemCreateReferenceSchema =
  githubCreateReferenceBaseSchema
    .extend({
      sourceType: z.literal("project_v2_issue_item"),
      externalType: z.literal("issue"),
      externalKey: githubIssueExternalKeySchema,
      externalUrl: githubUrlSchema,
      projectItemId: z.string().min(1).max(255),
      metadata: githubIssueCreateReferenceMetadataSchema.optional(),
    })
    .strict();

export const githubIssueCreateReferenceSchema = z.discriminatedUnion(
  "sourceType",
  [
    githubRepositoryIssueCreateReferenceSchema,
    githubProjectV2IssueItemCreateReferenceSchema,
  ],
);

export const githubBrowsingPaginationSchema = z.object({
  limit: z.number().int().min(1).max(100),
  hasNextPage: z.boolean(),
  nextPageToken: pageTokenSchema.nullable(),
});

export const githubOwnerListQuerySchema = z
  .object({
    type: githubOwnerTypeSchema.default("all"),
  })
  .strict();

export const githubOwnerSchema = z.object({
  login: z.string().min(1),
  label: z.string().min(1),
  type: githubOwnerScopeSchema,
  avatarUrl: githubUrlSchema.nullable(),
  url: githubUrlSchema.nullable(),
});

export const githubOwnerListResponseSchema = z.object({
  items: z.array(githubOwnerSchema),
});

export const githubRepositoryListQuerySchema =
  githubOwnerScopedQueryBaseSchema;

export const githubRepositorySchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1).nullable(),
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
  visibility: z.enum(["public", "private", "internal"]),
  isArchived: z.boolean(),
  description: z.string().nullable(),
  url: githubUrlSchema,
  updatedAt: dateTimeSchema,
});

export const githubRepositoryListResponseSchema = z.object({
  items: z.array(githubRepositorySchema),
  pagination: githubBrowsingPaginationSchema,
});

export const githubProjectListQuerySchema = githubOwnerScopedQueryBaseSchema;

export const githubProjectSchema = z.object({
  id: z.string().min(1),
  number: z.number().int().min(1),
  title: z.string().min(1),
  owner: z.string().min(1),
  state: z.enum(["open", "closed"]),
  description: z.string().nullable(),
  url: githubUrlSchema.nullable(),
  updatedAt: dateTimeSchema,
});

export const githubProjectListResponseSchema = z.object({
  items: z.array(githubProjectSchema),
  pagination: githubBrowsingPaginationSchema,
});

export const githubIssueListQuerySchema = githubBrowsingQueryBaseSchema
  .extend({
    state: githubIssueStateSchema.default("all"),
    q: optionalSearchSchema,
  })
  .strict();

export const githubIssueRepositorySchema = z.object({
  owner: z.string().min(1),
  name: z.string().min(1),
  fullName: z.string().min(1),
});

export const githubIssueSchema = z.object({
  id: z.string().min(1),
  nodeId: z.string().min(1).nullable(),
  repository: githubIssueRepositorySchema,
  number: z.number().int().min(1),
  title: z.string().min(1),
  state: z.enum(["open", "closed"]),
  url: githubUrlSchema,
  updatedAt: dateTimeSchema,
});

export const githubRepositoryIssueListResponseSchema = z.object({
  items: z.array(githubIssueSchema),
  pagination: githubBrowsingPaginationSchema,
});

export const githubProjectIssueItemSchema = z.object({
  projectItemId: z.string().min(1),
  isArchived: z.boolean(),
  issue: githubIssueSchema,
});

export const githubProjectIssueSkippedCountsSchema = z.object({
  pullRequests: z.number().int().min(0),
  draftIssues: z.number().int().min(0),
  redacted: z.number().int().min(0),
  unknown: z.number().int().min(0),
});

export const githubProjectIssueListResponseSchema = z.object({
  items: z.array(githubProjectIssueItemSchema),
  pagination: githubBrowsingPaginationSchema,
  skipped: githubProjectIssueSkippedCountsSchema,
});

export type GitHubConnectionAccount = z.infer<
  typeof githubConnectionAccountSchema
>;
export type GitHubConnectionStatusResponse = z.infer<
  typeof githubConnectionStatusResponseSchema
>;
export type GitHubAuthUrlResponse = z.infer<typeof githubAuthUrlResponseSchema>;
export type GitHubOwnerType = z.infer<typeof githubOwnerTypeSchema>;
export type GitHubOwnerScope = z.infer<typeof githubOwnerScopeSchema>;
export type GitHubIssueState = z.infer<typeof githubIssueStateSchema>;
export type SyncedGitHubIssue = z.infer<typeof syncedGitHubIssueSchema>;
export type GitHubProjectRepositoryCreateReference = z.infer<
  typeof githubProjectRepositoryCreateReferenceSchema
>;
export type GitHubProjectV2CreateReference = z.infer<
  typeof githubProjectV2CreateReferenceSchema
>;
export type GitHubProjectCreateReference = z.infer<
  typeof githubProjectCreateReferenceSchema
>;
export type GitHubRepositoryIssueCreateReference = z.infer<
  typeof githubRepositoryIssueCreateReferenceSchema
>;
export type GitHubProjectV2IssueItemCreateReference = z.infer<
  typeof githubProjectV2IssueItemCreateReferenceSchema
>;
export type GitHubIssueCreateReference = z.infer<
  typeof githubIssueCreateReferenceSchema
>;
export type GitHubBrowsingPagination = z.infer<
  typeof githubBrowsingPaginationSchema
>;
export type GitHubOwnerListQuery = z.infer<
  typeof githubOwnerListQuerySchema
>;
export type GitHubOwner = z.infer<typeof githubOwnerSchema>;
export type GitHubOwnerListResponse = z.infer<
  typeof githubOwnerListResponseSchema
>;
export type GitHubRepositoryListQuery = z.infer<
  typeof githubRepositoryListQuerySchema
>;
export type GitHubRepository = z.infer<typeof githubRepositorySchema>;
export type GitHubRepositoryListResponse = z.infer<
  typeof githubRepositoryListResponseSchema
>;
export type GitHubProjectListQuery = z.infer<
  typeof githubProjectListQuerySchema
>;
export type GitHubProject = z.infer<typeof githubProjectSchema>;
export type GitHubProjectListResponse = z.infer<
  typeof githubProjectListResponseSchema
>;
export type GitHubIssueListQuery = z.infer<typeof githubIssueListQuerySchema>;
export type GitHubIssueRepository = z.infer<
  typeof githubIssueRepositorySchema
>;
export type GitHubIssue = z.infer<typeof githubIssueSchema>;
export type GitHubRepositoryIssueListResponse = z.infer<
  typeof githubRepositoryIssueListResponseSchema
>;
export type GitHubProjectIssueItem = z.infer<
  typeof githubProjectIssueItemSchema
>;
export type GitHubProjectIssueSkippedCounts = z.infer<
  typeof githubProjectIssueSkippedCountsSchema
>;
export type GitHubProjectIssueListResponse = z.infer<
  typeof githubProjectIssueListResponseSchema
>;
