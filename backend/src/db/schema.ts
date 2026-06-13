import {
  pgTable,
  text,
  timestamp,
  integer,
  index,
  pgEnum,
} from "drizzle-orm/pg-core";

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

export const contacts = pgTable(
  "contacts",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    name: text("name").notNull(),
    email: text("email"),
    company: text("company"),
    type: contactTypeEnum("type").notNull().default("lead"),
    notes: text("notes"),
    linkedinUrl: text("linkedin_url"),
    twitterHandle: text("twitter_handle"),
    lastContactedAt: timestamp("last_contacted_at"),
    nextFollowUpAt: timestamp("next_follow_up_at"),
    priorityScore: integer("priority_score").default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("contacts_user_idx").on(t.userId),
    emailIdx: index("contacts_email_idx").on(t.email),
  }),
);

export const deals = pgTable(
  "deals",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
    contactId: text("contact_id").references(() => contacts.id, {
      onDelete: "cascade",
    }),
    title: text("title").notNull(),
    value: integer("value"),
    stage: dealStageEnum("stage").notNull().default("prospect"),
    probability: integer("probability").default(0),
    expectedCloseAt: timestamp("expected_close_at"),
    notes: text("notes"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("deals_user_idx").on(t.userId),
  }),
);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
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
    userIdx: index("tasks_user_idx").on(t.userId),
  }),
);

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    userId: text("user_id").notNull(),
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
    userIdx: index("activities_user_idx").on(t.userId),
    contactIdx: index("activities_contact_idx").on(t.contactId),
  }),
);

export type Contact = typeof contacts.$inferSelect;
export type NewContact = typeof contacts.$inferInsert;
export type Deal = typeof deals.$inferSelect;
export type NewDeal = typeof deals.$inferInsert;
export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;
export type Activity = typeof activities.$inferSelect;
export type NewActivity = typeof activities.$inferInsert;
