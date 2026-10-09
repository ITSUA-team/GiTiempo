-- Down-migration: remove invoice tables/columns introduced by the reverted
-- 0021_tearful_chat migration.  Safe to run even if the objects are already
-- absent (IF EXISTS guards).
ALTER TABLE "time_entries" DROP CONSTRAINT IF EXISTS "time_entries_invoice_id_invoices_id_fk";--> statement-breakpoint
DROP INDEX IF EXISTS "time_entries_invoice_id_idx";--> statement-breakpoint
ALTER TABLE "time_entries" DROP COLUMN IF EXISTS "invoice_id";--> statement-breakpoint
DROP INDEX IF EXISTS "invoices_workspace_id_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "invoices_workspace_project_idx";--> statement-breakpoint
DROP INDEX IF EXISTS "invoices_workspace_status_idx";--> statement-breakpoint
DROP TABLE IF EXISTS "invoices";