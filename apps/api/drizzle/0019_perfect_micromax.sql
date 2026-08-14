CREATE TABLE "jira_connections" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"atlassian_account_id" varchar(255) NOT NULL,
	"display_name" varchar(255) NOT NULL,
	"email" varchar(320),
	"avatar_url" text,
	"sites" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"access_token_encrypted" text,
	"refresh_token_encrypted" text,
	"token_expires_at" timestamp with time zone,
	"connected" boolean DEFAULT true NOT NULL,
	"reauthorization_required" boolean DEFAULT false NOT NULL,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "jira_oauth_states" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"state" varchar(128) NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"consumed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "jira_connections" ADD CONSTRAINT "jira_connections_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "jira_oauth_states" ADD CONSTRAINT "jira_oauth_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "jira_connections_user_id_unique" ON "jira_connections" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jira_connections_atlassian_account_id_idx" ON "jira_connections" USING btree ("atlassian_account_id");--> statement-breakpoint
CREATE UNIQUE INDEX "jira_oauth_states_state_unique" ON "jira_oauth_states" USING btree ("state");--> statement-breakpoint
CREATE INDEX "jira_oauth_states_user_id_idx" ON "jira_oauth_states" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "jira_oauth_states_expires_at_idx" ON "jira_oauth_states" USING btree ("expires_at");