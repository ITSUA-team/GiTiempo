ALTER TABLE "firebase_identity_reservations" ADD COLUMN "registration_display_name" varchar(255);--> statement-breakpoint
ALTER TABLE "firebase_identity_reservations" ADD COLUMN "registration_workspace_name" varchar(255);--> statement-breakpoint
ALTER TABLE "firebase_identity_reservations" ADD COLUMN "registration_owner_acknowledgement" boolean;