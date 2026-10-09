-- Serialize legacy writes with conflict cleanup and identity backfill. Drizzle
-- applies this migration in a transaction; no duplicate owner is chosen.
LOCK TABLE "github_connections", "github_oauth_states" IN SHARE ROW EXCLUSIVE MODE;
--> statement-breakpoint
CREATE TABLE "github_account_links" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"github_user_id" varchar(255) NOT NULL,
	"login" varchar(255) NOT NULL,
	"avatar_url" text,
	"connected_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_oauth_grants" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"account_link_id" uuid NOT NULL,
	"access_token_encrypted" text NOT NULL,
	"refresh_token_encrypted" text,
	"scopes" text[] DEFAULT '{}' NOT NULL,
	"token_expires_at" timestamp with time zone,
	"refresh_token_expires_at" timestamp with time zone,
	"authorized_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "github_authorization_generations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"generation" integer DEFAULT 0 NOT NULL,
	"disconnected_at" timestamp with time zone,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "github_oauth_states" ADD COLUMN "provider" varchar(32) DEFAULT 'github_app' NOT NULL;--> statement-breakpoint
ALTER TABLE "github_oauth_states" ADD COLUMN "purpose" varchar(64) DEFAULT 'personal_data' NOT NULL;--> statement-breakpoint
ALTER TABLE "github_oauth_states" ADD COLUMN "session_token_hash" varchar(64);--> statement-breakpoint
ALTER TABLE "github_oauth_states" ADD COLUMN "generation" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE "github_account_links" ADD CONSTRAINT "github_account_links_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_oauth_grants" ADD CONSTRAINT "github_oauth_grants_account_link_id_github_account_links_id_fk" FOREIGN KEY ("account_link_id") REFERENCES "public"."github_account_links"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "github_authorization_generations" ADD CONSTRAINT "github_authorization_generations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- Remove every personal binding for a GitHub identity with multiple active
-- owners, including historical rows for that identity. Preserve GiTiempo users,
-- sessions and workspace data. Pending callbacks must not restore old grants.
WITH duplicate_identities AS (
  SELECT "github_user_id"
  FROM "github_connections"
  WHERE "connected" = true AND "access_token_encrypted" IS NOT NULL
  GROUP BY "github_user_id"
  HAVING count(DISTINCT "user_id") > 1
), removed_connections AS (
  DELETE FROM "github_connections" AS connection
  USING duplicate_identities AS duplicate
  WHERE connection."github_user_id" = duplicate."github_user_id"
  RETURNING connection."user_id"
), invalidated_states AS (
  DELETE FROM "github_oauth_states"
  WHERE "user_id" IN (SELECT "user_id" FROM removed_connections)
)
INSERT INTO "github_authorization_generations" (
  "user_id", "generation", "disconnected_at", "updated_at"
)
SELECT "user_id", 1, now(), now()
FROM removed_connections;
--> statement-breakpoint
INSERT INTO "github_account_links" (
  "user_id", "github_user_id", "login", "avatar_url", "connected_at", "updated_at"
)
SELECT
  "user_id", "github_user_id", "login", "avatar_url", "connected_at", "updated_at"
FROM "github_connections"
WHERE "connected" = true
  AND "access_token_encrypted" IS NOT NULL;
--> statement-breakpoint
CREATE UNIQUE INDEX "github_account_links_user_id_unique" ON "github_account_links" USING btree ("user_id");--> statement-breakpoint
CREATE UNIQUE INDEX "github_account_links_github_user_id_unique" ON "github_account_links" USING btree ("github_user_id");--> statement-breakpoint
CREATE INDEX "github_account_links_login_idx" ON "github_account_links" USING btree ("login");--> statement-breakpoint
CREATE UNIQUE INDEX "github_oauth_grants_account_link_id_unique" ON "github_oauth_grants" USING btree ("account_link_id");--> statement-breakpoint
CREATE INDEX "github_oauth_grants_expires_at_idx" ON "github_oauth_grants" USING btree ("token_expires_at");--> statement-breakpoint
CREATE UNIQUE INDEX "github_authorization_generations_user_id_unique" ON "github_authorization_generations" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "github_oauth_states_account_link_idx" ON "github_oauth_states" USING btree ("user_id","purpose","expires_at");
