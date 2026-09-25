CREATE TABLE "github_installation_setup_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"state" varchar(256) NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"organization_id" varchar(30) NOT NULL,
	"organization_login" varchar(255) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_installation_webhook_deliveries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"delivery_id" varchar(255) NOT NULL,
	"event" varchar(100) NOT NULL,
	"received_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspace_github_installations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"organization_id" varchar(30) NOT NULL,
	"organization_login" varchar(255) NOT NULL,
	"normalized_organization_login" varchar(255) NOT NULL,
	"installation_id" varchar(30) NOT NULL,
	"app_id" varchar(30) NOT NULL,
	"status" varchar(20) NOT NULL,
	"authorization_version" integer DEFAULT 1 NOT NULL,
	"verified_at" timestamp with time zone,
	"verified_by_user_id" uuid,
	"recovery_reason" varchar(500),
	"disconnected_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_installation_setup_states" ADD CONSTRAINT "github_installation_setup_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_installation_setup_states" ADD CONSTRAINT "github_installation_setup_states_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_github_installations" ADD CONSTRAINT "workspace_github_installations_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "workspace_github_installations" ADD CONSTRAINT "workspace_github_installations_verified_by_user_id_users_id_fk" FOREIGN KEY ("verified_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_setup_states_state_unique" ON "github_installation_setup_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "github_installation_setup_states_expiry_idx" ON "github_installation_setup_states" USING btree ("expires_at");--> statement-breakpoint
CREATE INDEX "github_installation_setup_states_user_workspace_idx" ON "github_installation_setup_states" USING btree ("user_id","workspace_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_installation_webhook_deliveries_delivery_id_unique" ON "github_installation_webhook_deliveries" USING btree ("delivery_id");--> statement-breakpoint
CREATE UNIQUE INDEX "workspace_github_installations_workspace_organization_unique" ON "workspace_github_installations" USING btree ("workspace_id","organization_id");--> statement-breakpoint
CREATE INDEX "workspace_github_installations_installation_id_idx" ON "workspace_github_installations" USING btree ("installation_id");--> statement-breakpoint
CREATE INDEX "workspace_github_installations_workspace_status_idx" ON "workspace_github_installations" USING btree ("workspace_id","status");