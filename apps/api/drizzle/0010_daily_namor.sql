ALTER TABLE "tasks" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "priority" varchar(20) DEFAULT 'medium' NOT NULL;--> statement-breakpoint
ALTER TABLE "tasks" ADD COLUMN "assignee_user_id" uuid;--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_assignee_user_id_users_id_fk" FOREIGN KEY ("assignee_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "tasks_assignee_user_id_idx" ON "tasks" USING btree ("assignee_user_id");--> statement-breakpoint
ALTER TABLE "tasks" ADD CONSTRAINT "tasks_priority_check" CHECK ("tasks"."priority" IN ('low', 'medium', 'high'));