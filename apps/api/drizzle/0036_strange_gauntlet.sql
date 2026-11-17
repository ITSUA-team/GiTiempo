ALTER TABLE "invoices" ADD COLUMN "issue_date" date DEFAULT CURRENT_DATE NOT NULL;--> statement-breakpoint
UPDATE "invoices" SET "issue_date" = ("created_at" AT TIME ZONE COALESCE((SELECT "time_zone" FROM "workspace_settings" WHERE "workspace_id" = "invoices"."workspace_id"), 'UTC'))::date;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "due_date" date;--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_payment_dates_check" CHECK ("invoices"."due_date" IS NULL OR "invoices"."due_date" >= "invoices"."issue_date");