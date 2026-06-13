import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

// Enums
export const contactTypeEnum = pgEnum("contact_type", [
  "lead",
  "customer",
  "investor",
  "advisor",
  "partner",
]);

export const dealStageEnum = pgEnum("deal_stage", [
  "prospect",
  "contacted",
  "meeting",
  "proposal",
  "negotiation",
  "closed_won",
  "closed_lost",
]);

export const taskStatusEnum = pgEnum("task_status", [
  "todo",
  "in_progress",
  "done",
  "cancelled",
]);

export const taskPriorityEnum = pgEnum("task_priority", [
  "p0",
  "p1",
  "p2",
  "p3",
]);

export const memberRoleEnum = pgEnum("member_role", ["owner", "member"]);

export const pipelineTypeEnum = pgEnum("pipeline_type", [
  "sales",
  "fundraising",
  "partnership",
]);

export const planEnum = pgEnum("plan", ["solo", "founder", "studio"]);

// Workspaces — one per user on signup, supports up to plan seat limit
export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    ownerClerkId: text("owner_clerk_id").notNull().unique(),
    plan: planEnum("plan").notNull().default("solo"),
    aiActionsUsed: integer("ai_actions_used").notNull().default(0),
    aiActionsResetAt: timestamp("ai_actions_reset_at").notNull().defaultNow(),
    webhookUrl: text("webhook_url"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("workspaces_owner_idx").on(t.ownerClerkId),
  }),
);

// Workspace memberships — ties Clerk users to workspaces
export const workspaceMemberships = pgTable(
  "workspace_memberships",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    clerkUserId: text("clerk_user_id").notNull(),
    role: memberRoleEnum("role").notNull().default("member"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("memberships_workspace_idx").on(t.workspaceId),
    userIdx: index("memberships_user_idx").on(t.clerkUserId),
  }),
);

// Contacts
export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    type: contactTypeEnum("type").notNull().default("lead"),
    notes: text("notes"),
    linkedinUrl: text("linkedin_url"),
    twitterHandle: text("twitter_handle"),
    lastContactedAt: timestamp("last_contacted_at"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    cadenceDays: integer("cadence_days"),
    priorityScore: integer("priority_score").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("contacts_workspace_idx").on(t.workspaceId),
    emailIdx: index("contacts_email_idx").on(t.email),
  }),
);

// Deals
export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    title: text("title").notNull(),
    value: integer("value"),
    pipelineType: pipelineTypeEnum("pipeline_type").notNull().default("sales"),
    stage: dealStageEnum("stage").notNull().default("prospect"),
    stageChangedAt: timestamp("stage_changed_at").notNull().defaultNow(),
    probability: integer("probability").default(0),
    expectedCloseAt: timestamp("expected_close_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("deals_workspace_idx").on(t.workspaceId),
    stageChangedIdx: index("deals_stage_changed_idx").on(t.stageChangedAt),
  }),
);

// Tasks (product backlog items)
export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    description: text("description"),
    status: taskStatusEnum("status").notNull().default("todo"),
    priority: taskPriorityEnum("priority").notNull().default("p2"),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    dealId: text("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    dueAt: timestamp("due_at"),
    completedAt: timestamp("completed_at"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("tasks_workspace_idx").on(t.workspaceId),
    statusIdx: index("tasks_status_idx").on(t.status),
  }),
);

// Activities (email sync, call logs, notes)
export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    dealId: text("deal_id").references(() => deals.id, {
      onDelete: "set null",
    }),
    type: text("type").notNull(),
    subject: text("subject"),
    body: text("body"),
    metadata: text("metadata"),
    occurredAt: timestamp("occurred_at").notNull().defaultNow(),
    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("activities_workspace_idx").on(t.workspaceId),
    contactIdx: index("activities_contact_idx").on(t.contactId),
    occurredAtIdx: index("activities_occurred_at_idx").on(t.occurredAt),
  }),
);

// Email sync state (prevent duplicate logging on re-auth)
export const emailSyncLog = pgTable(
  "email_sync_log",
  {
    id: text("id").primaryKey(),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    messageId: text("message_id").notNull(),
    threadId: text("thread_id").notNull(),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "set null",
    }),
    direction: text("direction").notNull(),
    syncedAt: timestamp("synced_at").notNull().defaultNow(),
  },
  (t) => ({
    workspaceIdx: index("email_sync_workspace_idx").on(t.workspaceId),
    messageIdIdx: index("email_sync_message_id_idx").on(
      t.workspaceId,
      t.messageId,
    ),
  }),
);

// Exported types
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type WorkspaceMembership = typeof workspaceMemberships.$inferSelect;
export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
