ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_identity_key" UNIQUE("id","workspace_id");--> statement-breakpoint
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_workspace_reference_key" UNIQUE("workspace_id","reference");--> statement-breakpoint
CREATE SEQUENCE IF NOT EXISTS invoice_reference_sequence;
--> statement-breakpoint
ALTER TABLE "invoice_group_memberships" ADD CONSTRAINT "invoice_group_memberships_invoice_id_workspace_id_invoices_id_workspace_id_fk" FOREIGN KEY ("invoice_id","workspace_id") REFERENCES "public"."invoices"("id","workspace_id") ON DELETE cascade ON UPDATE no action;