ALTER TABLE "refresh_tokens" ADD COLUMN "workspace_id" uuid;--> statement-breakpoint
UPDATE "refresh_tokens" AS "refresh_tokens"
SET "workspace_id" = "default_membership"."workspace_id"
FROM (
  SELECT DISTINCT ON ("workspace_members"."user_id")
    "workspace_members"."user_id",
    "workspace_members"."workspace_id"
  FROM "workspace_members"
  ORDER BY
    "workspace_members"."user_id",
    "workspace_members"."joined_at" ASC,
    "workspace_members"."workspace_id" ASC
) AS "default_membership"
WHERE "refresh_tokens"."user_id" = "default_membership"."user_id";--> statement-breakpoint
DELETE FROM "refresh_tokens"
WHERE "workspace_id" IS NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ALTER COLUMN "workspace_id" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_workspace_id_idx" ON "refresh_tokens" USING btree ("workspace_id");
