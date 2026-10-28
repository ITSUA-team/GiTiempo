CREATE TABLE "firebase_identity_reservations" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"normalized_email" varchar(255) NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"state" varchar(16) DEFAULT 'reserved' NOT NULL,
	"user_id" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "firebase_subject_bindings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"user_id" uuid NOT NULL,
	"provider_id" varchar(64) NOT NULL,
	"verified_email" varchar(255) NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DROP INDEX "workspaces_name_lookup_unique";--> statement-breakpoint
ALTER TABLE "firebase_identity_reservations" ADD CONSTRAINT "firebase_identity_reservations_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "firebase_subject_bindings" ADD CONSTRAINT "firebase_subject_bindings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "firebase_identity_reservations_email_unique" ON "firebase_identity_reservations" USING btree (lower(btrim("normalized_email")));--> statement-breakpoint
CREATE UNIQUE INDEX "firebase_identity_reservations_uid_unique" ON "firebase_identity_reservations" USING btree ("firebase_uid");--> statement-breakpoint
CREATE UNIQUE INDEX "firebase_subject_bindings_uid_unique" ON "firebase_subject_bindings" USING btree ("firebase_uid");--> statement-breakpoint
CREATE INDEX "firebase_subject_bindings_user_id_idx" ON "firebase_subject_bindings" USING btree ("user_id");