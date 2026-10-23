-- Backfill time rounding step minutes to 1 for all existing records.
-- The columns were added in 0024; workspace_settings and invoices already
-- carry NOT NULL DEFAULT 1 so those UPDATEs are safety nets, while projects
-- allowed NULL (the old "inherit from workspace" sentinel) and is the
-- primary target of this backfill.
UPDATE "workspace_settings" SET "time_rounding_step_minutes" = 1 WHERE "time_rounding_step_minutes" IS NULL;--> statement-breakpoint
UPDATE "projects" SET "time_rounding_step_minutes" = 1 WHERE "time_rounding_step_minutes" IS NULL;--> statement-breakpoint
UPDATE "invoices" SET "rounding_step_minutes" = 1 WHERE "rounding_step_minutes" IS NULL;