CREATE TABLE "identity_recovery_audit" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"reservation_id" uuid NOT NULL,
	"normalized_email" varchar(255) NOT NULL,
	"firebase_uid" varchar(128) NOT NULL,
	"purpose" varchar(32) NOT NULL,
	"registration_display_name" varchar(255),
	"registration_workspace_name" varchar(255),
	"operator_identity" varchar(255) NOT NULL,
	"operator_decision" varchar(255) NOT NULL,
	"provider_absence_evidence" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "identity_recovery_audit" ADD CONSTRAINT "identity_recovery_audit_reservation_id_firebase_identity_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."firebase_identity_reservations"("id") ON DELETE cascade ON UPDATE no action;