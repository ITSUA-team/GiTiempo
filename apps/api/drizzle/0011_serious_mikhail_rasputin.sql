ALTER TABLE "projects" ADD COLUMN "default_task_billable" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "default_time_entry_billable" boolean DEFAULT true NOT NULL;
