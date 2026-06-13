import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  unique,
} from "drizzle-orm/pg-core";

export const waitlists = pgTable("waitlists", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  description: text("description"),
  websiteUrl: text("website_url"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

export const subscribers = pgTable(
  "subscribers",
  {
    id: text("id").primaryKey(),
    waitlistId: text("waitlist_id")
      .notNull()
      .references(() => waitlists.id, { onDelete: "cascade" }),
    email: text("email").notNull(),
    referralCode: text("referral_code").notNull().unique(),
    referredBy: text("referred_by"),
    referralCount: integer("referral_count").notNull().default(0),
    position: integer("position").notNull(),
    status: text("status").notNull().default("waiting"), // waiting | invited | removed
    joinedAt: timestamp("joined_at").notNull().defaultNow(),
  },
  (t) => ({
    waitlistEmailUnique: unique().on(t.waitlistId, t.email),
    waitlistIdx: index("subscribers_waitlist_idx").on(t.waitlistId),
    referralCodeIdx: index("subscribers_referral_code_idx").on(t.referralCode),
  }),
);

export type Waitlist = typeof waitlists.$inferSelect;
export type NewWaitlist = typeof waitlists.$inferInsert;
export type Subscriber = typeof subscribers.$inferSelect;
export type NewSubscriber = typeof subscribers.$inferInsert;
