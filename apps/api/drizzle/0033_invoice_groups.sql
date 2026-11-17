CREATE TABLE "invoice_group_memberships" (
	"workspace_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"invoice_id" uuid NOT NULL,
	"group_id" uuid NOT NULL,
	CONSTRAINT "invoice_group_single_membership" UNIQUE("workspace_id","owner_id","invoice_id")
);
--> statement-breakpoint
CREATE TABLE "invoice_groups" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"owner_id" uuid NOT NULL,
	"name" text NOT NULL,
	CONSTRAINT "invoice_group_owner_key" UNIQUE("id","workspace_id","owner_id")
);
--> statement-breakpoint
ALTER TABLE "invoice_group_memberships" ADD CONSTRAINT "invoice_group_memberships_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_group_memberships" ADD CONSTRAINT "invoice_group_memberships_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_group_memberships" ADD CONSTRAINT "invoice_group_memberships_invoice_id_invoices_id_fk" FOREIGN KEY ("invoice_id") REFERENCES "public"."invoices"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_group_memberships" ADD CONSTRAINT "invoice_group_memberships_group_id_workspace_id_owner_id_invoice_groups_id_workspace_id_owner_id_fk" FOREIGN KEY ("group_id","workspace_id","owner_id") REFERENCES "public"."invoice_groups"("id","workspace_id","owner_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_groups" ADD CONSTRAINT "invoice_groups_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "invoice_groups" ADD CONSTRAINT "invoice_groups_owner_id_users_id_fk" FOREIGN KEY ("owner_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "invoice_group_name_key" ON "invoice_groups" USING btree ("workspace_id","owner_id",lower(trim("name")));