ALTER TABLE "projects" ADD COLUMN "visibility" varchar(20) DEFAULT 'private' NOT NULL;--> statement-breakpoint
CREATE INDEX "projects_workspace_active_visibility_idx" ON "projects" USING btree ("workspace_id","is_active","visibility");--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_visibility_check" CHECK ("projects"."visibility" IN ('public', 'private'));