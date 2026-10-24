CREATE TABLE "budget_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"description" varchar(200) NOT NULL,
	"estimated_cost_cents" integer DEFAULT 0 NOT NULL,
	"actual_cost_cents" integer DEFAULT 0 NOT NULL,
	"status" varchar(20) DEFAULT 'ESTIMATED' NOT NULL,
	"origin" varchar(20) DEFAULT 'AI_GENERATED' NOT NULL,
	"is_custom_by_user" boolean DEFAULT false NOT NULL,
	"is_guest_sensitive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"workspace_id" uuid NOT NULL,
	"title" varchar(120) NOT NULL,
	"archetype" varchar(20) NOT NULL,
	"event_date" varchar(10) NOT NULL,
	"timezone" varchar(50) DEFAULT 'UTC' NOT NULL,
	"location" varchar(200) DEFAULT 'TBD' NOT NULL,
	"guest_count" integer DEFAULT 0 NOT NULL,
	"total_budget_cents" integer DEFAULT 0 NOT NULL,
	"currency" varchar(3) DEFAULT 'USD' NOT NULL,
	"preferences" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "idea_items" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" text NOT NULL,
	"estimated_cost_cents" integer,
	"origin" varchar(20) DEFAULT 'AI_GENERATED' NOT NULL,
	"is_custom_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "timeline_milestones" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"title" varchar(150) NOT NULL,
	"description" varchar(500) DEFAULT '',
	"due_at" varchar(10) NOT NULL,
	"offset_days_from_event" integer,
	"status" varchar(20) DEFAULT 'NOT_STARTED' NOT NULL,
	"origin" varchar(20) DEFAULT 'AI_GENERATED' NOT NULL,
	"is_custom_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "vendor_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"event_id" uuid NOT NULL,
	"category" varchar(50) NOT NULL,
	"title" varchar(150) NOT NULL,
	"requirements" text DEFAULT '',
	"status" varchar(20) DEFAULT 'NOT_STARTED' NOT NULL,
	"estimated_cost_cents" integer,
	"origin" varchar(20) DEFAULT 'AI_GENERATED' NOT NULL,
	"is_custom_by_user" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "workspaces" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"token_hash" varchar(64) NOT NULL,
	"name" varchar(100) DEFAULT 'Guest Workspace' NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "budget_items" ADD CONSTRAINT "budget_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "events" ADD CONSTRAINT "events_workspace_id_workspaces_id_fk" FOREIGN KEY ("workspace_id") REFERENCES "public"."workspaces"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "idea_items" ADD CONSTRAINT "idea_items_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "timeline_milestones" ADD CONSTRAINT "timeline_milestones_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "vendor_tasks" ADD CONSTRAINT "vendor_tasks_event_id_events_id_fk" FOREIGN KEY ("event_id") REFERENCES "public"."events"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "budget_items_event_id_idx" ON "budget_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "budget_items_category_idx" ON "budget_items" USING btree ("category");--> statement-breakpoint
CREATE INDEX "event_workspace_id_idx" ON "events" USING btree ("workspace_id");--> statement-breakpoint
CREATE INDEX "event_date_idx" ON "events" USING btree ("event_date");--> statement-breakpoint
CREATE INDEX "idea_items_event_id_idx" ON "idea_items" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "milestones_event_id_idx" ON "timeline_milestones" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "milestones_due_at_idx" ON "timeline_milestones" USING btree ("due_at");--> statement-breakpoint
CREATE INDEX "vendor_tasks_event_id_idx" ON "vendor_tasks" USING btree ("event_id");--> statement-breakpoint
CREATE INDEX "workspace_token_hash_idx" ON "workspaces" USING btree ("token_hash");--> statement-breakpoint
CREATE INDEX "workspace_expires_at_idx" ON "workspaces" USING btree ("expires_at");