CREATE TABLE "workspace_github_organizations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"organization_login" varchar(255) NOT NULL,
	"normalized_login" varchar(255) NOT NULL,
	"created_by_user_id" uuid NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "workspace_github_organizations" ADD CONSTRAINT "workspace_github_organizations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_github_organizations" ADD CONSTRAINT "workspace_github_organizations_created_by_user_id_users_id_fk" FOREIGN KEY ("created_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "workspace_github_organizations_workspace_id_idx" ON "workspace_github_organizations" USING btree ("workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_github_organizations_workspace_id_normalized_login_unique" ON "workspace_github_organizations" USING btree ("workspace_id","normalized_login");