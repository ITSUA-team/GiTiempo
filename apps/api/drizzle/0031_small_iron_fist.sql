ALTER TABLE "firebase_identity_reservations" ALTER COLUMN "creation_outcome_pending" SET DEFAULT true;
--> statement-breakpoint
UPDATE "firebase_identity_reservations"
SET "creation_outcome_pending" = true
WHERE "purpose" = 'registration' AND "state" = 'reserved';
