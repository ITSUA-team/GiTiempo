ALTER TABLE "identity_recovery_audit" DROP CONSTRAINT "identity_recovery_audit_reservation_id_firebase_identity_reservations_id_fk";
--> statement-breakpoint
DROP INDEX "firebase_identity_reservations_email_unique";--> statement-breakpoint
ALTER TABLE "identity_recovery_audit" ADD CONSTRAINT "identity_recovery_audit_reservation_id_firebase_identity_reservations_id_fk" FOREIGN KEY ("reservation_id") REFERENCES "public"."firebase_identity_reservations"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "firebase_identity_reservations_email_unique" ON "firebase_identity_reservations" USING btree (lower(btrim("normalized_email"))) WHERE "firebase_identity_reservations"."state" != 'resolved';