import {
  pgTable,
  uuid,
  varchar,
  integer,
  boolean,
  timestamp,
  text,
  jsonb,
  index,
} from "drizzle-orm/pg-core";

// ==============================================================================
// 1. USERS TABLE
// ==============================================================================
export const users = pgTable(
  "users",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    email: varchar("email", { length: 255 }).notNull().unique(),
    passwordHash: varchar("password_hash", { length: 255 }).notNull(),
    name: varchar("name", { length: 100 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("users_email_idx").on(table.email)]
);

// ==============================================================================
// 2. SESSIONS TABLE
// ==============================================================================
export const sessions = pgTable(
  "sessions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    sessionToken: varchar("session_token", { length: 255 }).notNull().unique(),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("sessions_token_idx").on(table.sessionToken),
    index("sessions_user_id_idx").on(table.userId),
  ]
);

// ==============================================================================
// 3. WORKSPACES TABLE
// ==============================================================================
export const workspaces = pgTable(
  "workspaces",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
    tokenHash: varchar("token_hash", { length: 64 }).notNull(),
    name: varchar("name", { length: 100 }).notNull().default("Guest Workspace"),
    expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("workspace_token_hash_idx").on(table.tokenHash),
    index("workspace_expires_at_idx").on(table.expiresAt),
    index("workspace_user_id_idx").on(table.userId),
  ]
);

// ==============================================================================
// 4. EVENTS TABLE
// ==============================================================================
export const events = pgTable(
  "events",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    userId: uuid("user_id").references(() => users.id, { onDelete: "cascade" }),
    workspaceId: uuid("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 120 }).notNull(),
    archetype: varchar("archetype", { length: 20 }).notNull(), // WEDDING, BIRTHDAY, COMMUNITY
    eventDate: varchar("event_date", { length: 10 }).notNull(), // YYYY-MM-DD
    timezone: varchar("timezone", { length: 50 }).notNull().default("UTC"),
    location: varchar("location", { length: 200 }).notNull().default("TBD"),
    guestCount: integer("guest_count").notNull().default(0),
    totalBudgetCents: integer("total_budget_cents").notNull().default(0),
    currency: varchar("currency", { length: 3 }).notNull().default("USD"),
    preferences: jsonb("preferences").notNull().default({}),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("event_workspace_id_idx").on(table.workspaceId),
    index("event_user_id_idx").on(table.userId),
    index("event_date_idx").on(table.eventDate),
  ]
);

// ==============================================================================
// 3. BUDGET ITEMS TABLE
// ==============================================================================
export const budgetItems = pgTable(
  "budget_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(),
    description: varchar("description", { length: 200 }).notNull(),
    estimatedCostCents: integer("estimated_cost_cents").notNull().default(0),
    actualCostCents: integer("actual_cost_cents").notNull().default(0),
    status: varchar("status", { length: 20 }).notNull().default("ESTIMATED"),
    origin: varchar("origin", { length: 20 }).notNull().default("AI_GENERATED"),
    isCustomByUser: boolean("is_custom_by_user").notNull().default(false),
    isGuestSensitive: boolean("is_guest_sensitive").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("budget_items_event_id_idx").on(table.eventId),
    index("budget_items_category_idx").on(table.category),
  ]
);

// ==============================================================================
// 4. TIMELINE MILESTONES TABLE
// ==============================================================================
export const timelineMilestones = pgTable(
  "timeline_milestones",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    title: varchar("title", { length: 150 }).notNull(),
    description: varchar("description", { length: 500 }).default(""),
    dueAt: varchar("due_at", { length: 10 }).notNull(), // YYYY-MM-DD
    offsetDaysFromEvent: integer("offset_days_from_event"),
    status: varchar("status", { length: 20 }).notNull().default("NOT_STARTED"),
    origin: varchar("origin", { length: 20 }).notNull().default("AI_GENERATED"),
    isCustomByUser: boolean("is_custom_by_user").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    index("milestones_event_id_idx").on(table.eventId),
    index("milestones_due_at_idx").on(table.dueAt),
  ]
);

// ==============================================================================
// 5. VENDOR TASKS TABLE
// ==============================================================================
export const vendorTasks = pgTable(
  "vendor_tasks",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    requirements: text("requirements").default(""),
    status: varchar("status", { length: 20 }).notNull().default("NOT_STARTED"),
    estimatedCostCents: integer("estimated_cost_cents"),
    origin: varchar("origin", { length: 20 }).notNull().default("AI_GENERATED"),
    isCustomByUser: boolean("is_custom_by_user").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("vendor_tasks_event_id_idx").on(table.eventId)]
);

// ==============================================================================
// 6. IDEA ITEMS TABLE
// ==============================================================================
export const ideaItems = pgTable(
  "idea_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    eventId: uuid("event_id")
      .notNull()
      .references(() => events.id, { onDelete: "cascade" }),
    category: varchar("category", { length: 50 }).notNull(),
    title: varchar("title", { length: 150 }).notNull(),
    description: text("description").notNull(),
    estimatedCostCents: integer("estimated_cost_cents"),
    origin: varchar("origin", { length: 20 }).notNull().default("AI_GENERATED"),
    isCustomByUser: boolean("is_custom_by_user").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [index("idea_items_event_id_idx").on(table.eventId)]
);
