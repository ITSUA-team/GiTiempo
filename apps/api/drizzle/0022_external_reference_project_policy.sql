ALTER TABLE "projects"
  ADD COLUMN "tracking_mode" varchar(32) DEFAULT 'managed' NOT NULL;
--> statement-breakpoint
ALTER TABLE "project_external_refs"
  ADD COLUMN "reference_provenance" varchar(32) DEFAULT 'provider-verified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "task_external_refs"
  ADD COLUMN "reference_provenance" varchar(32) DEFAULT 'provider-verified' NOT NULL;
--> statement-breakpoint
ALTER TABLE "projects"
  ADD CONSTRAINT "projects_tracking_mode_check"
  CHECK ("tracking_mode" IN ('managed', 'external-reference'));
--> statement-breakpoint
ALTER TABLE "project_external_refs"
  ADD CONSTRAINT "project_external_refs_provenance_check"
  CHECK ("reference_provenance" IN ('provider-verified', 'user-supplied'));
--> statement-breakpoint
ALTER TABLE "task_external_refs"
  ADD CONSTRAINT "task_external_refs_provenance_check"
  CHECK ("reference_provenance" IN ('provider-verified', 'user-supplied'));
--> statement-breakpoint
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM "project_external_refs"
    WHERE "provider" = 'github' AND "external_type" = 'repository'
    GROUP BY "workspace_id", "provider", lower("external_key")
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION
      'Case-insensitive GitHub repository reference collisions found. Run github:repository-reference-preflight and resolve the listed record IDs before applying 0022.';
  END IF;
END $$;
--> statement-breakpoint
CREATE UNIQUE INDEX "project_external_refs_workspace_provider_repository_key_ci_unique"
  ON "project_external_refs" USING btree ("workspace_id", "provider", lower("external_key"))
  WHERE "provider" = 'github' AND "external_type" = 'repository';
