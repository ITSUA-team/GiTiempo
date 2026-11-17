ALTER TABLE "workspace_settings" ADD COLUMN "billing_profile" jsonb;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "reference" text DEFAULT 'INV-' || gen_random_uuid()::text NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "revision" integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE "invoices" ADD COLUMN "document" jsonb;