CREATE TABLE "time_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"user_id" uuid NOT NULL,
	"workspace_id" uuid NOT NULL,
	"started_at" timestamp with time zone NOT NULL,
	"ended_at" timestamp with time zone,
	"duration_seconds" integer,
	"description" text,
	"is_billable" boolean DEFAULT true NOT NULL,
	"source" varchar(20) DEFAULT 'web' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "time_entries_duration_state_check" CHECK ((
        ("time_entries"."ended_at" IS NULL AND "time_entries"."duration_seconds" IS NULL)
        OR
        (
          "time_entries"."ended_at" IS NOT NULL
          AND "time_entries"."ended_at" > "time_entries"."started_at"
          AND "time_entries"."duration_seconds" IS NOT NULL
          AND "time_entries"."duration_seconds" > 0
        )
      )),
	CONSTRAINT "time_entries_source_check" CHECK ("time_entries"."source" IN ('web', 'extension', 'manual'))
);
--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_task_id_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."tasks"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "time_entries" ADD CONSTRAINT "time_entries_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "time_entries_task_id_idx" ON "time_entries" USING btree ("task_id");--> statement-breakpoint
CREATE INDEX "time_entries_user_id_idx" ON "time_entries" USING btree ("user_id");--> statement-breakpoint
CREATE INDEX "time_entries_workspace_id_idx" ON "time_entries" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "time_entries_started_at_idx" ON "time_entries" USING btree ("started_at");--> statement-breakpoint
CREATE INDEX "time_entries_date_range_idx" ON "time_entries" USING btree ("workspace_id","user_id","started_at","ended_at");--> statement-breakpoint
CREATE UNIQUE INDEX "time_entries_running_unique" ON "time_entries" USING btree ("user_id") WHERE "time_entries"."ended_at" IS NULL;