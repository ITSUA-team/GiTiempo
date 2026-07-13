-- Intentional release behavior: legacy refresh-token rows cannot be bound to
-- a workspace membership safely, so this migration invalidates all existing app
-- sessions.
DELETE FROM "refresh_tokens";--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD COLUMN "workspace_member_id" uuid NOT NULL;--> statement-breakpoint
ALTER TABLE "refresh_tokens" ADD CONSTRAINT "refresh_tokens_workspace_member_id_workspace_members_id_fk" FOREIGN KEY ("workspace_member_id") REFERENCES "public"."workspace_members"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "refresh_tokens_workspace_member_id_idx" ON "refresh_tokens" USING btree ("workspace_member_id");
