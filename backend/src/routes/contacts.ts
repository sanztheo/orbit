import { zValidator } from "@hono/zod-validator";
import { and, eq, ilike, isNull, lt, or } from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, contacts } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import type { WorkspaceEnv } from "../middleware/workspace.js";

const createSchema = z.object({
  name: z.string().min(1),
  email: z.email().nullish(),
  company: z.string().nullish(),
  type: z
    .enum(["lead", "customer", "investor", "advisor", "partner"])
    .optional(),
  notes: z.string().nullish(),
  linkedinUrl: z.string().url().nullish(),
  twitterHandle: z.string().nullish(),
});

const toDate = z
  .string()
  .datetime()
  .transform((s) => new Date(s));

const updateSchema = createSchema.partial().extend({
  lastContactedAt: toDate.optional(),
  nextFollowUpAt: toDate.optional(),
  cadenceDays: z.number().int().min(1).max(365).nullable().optional(),
  priorityScore: z.number().int().min(0).optional(),
});

export const contactsRouter = new Hono<WorkspaceEnv>()
  .get("/", async (c) => {
    const workspaceId = c.get("workspaceId");
    const search = c.req.query("search");
    const type = c.req.query("type") as
      | "lead"
      | "customer"
      | "investor"
      | "advisor"
      | "partner"
      | undefined;

    const stale = c.req.query("stale") === "1";
    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const searchFilter = search
      ? or(
          ilike(contacts.name, `%${search}%`),
          ilike(contacts.email, `%${search}%`),
          ilike(contacts.company, `%${search}%`),
          ilike(contacts.notes, `%${search}%`),
        )
      : undefined;

    const typeFilter = type ? eq(contacts.type, type) : undefined;

    const staleFilter = stale
      ? or(
          isNull(contacts.lastContactedAt),
          lt(contacts.lastContactedAt, oneEightyDaysAgo),
        )
      : undefined;

    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          searchFilter,
          typeFilter,
          staleFilter,
        ),
      );
    return c.json({ data: rows, total: rows.length });
  })
  .get("/export", async (c) => {
    const workspaceId = c.get("workspaceId");
    const rows = await db
      .select()
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId));

    const header = "name,email,company,type,notes,lastContactedAt,createdAt";
    const escape = (v: string | null) =>
      v == null ? "" : `"${v.replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        escape(r.name),
        escape(r.email),
        escape(r.company),
        escape(r.type),
        escape(r.notes),
        r.lastContactedAt ? r.lastContactedAt.toISOString() : "",
        r.createdAt.toISOString(),
      ].join(","),
    );

    c.header("Content-Type", "text/csv");
    c.header("Content-Disposition", 'attachment; filename="contacts.csv"');
    return c.body([header, ...lines].join("\n"));
  })
  .post("/import", async (c) => {
    const workspaceId = c.get("workspaceId");
    let text: string;
    try {
      const form = await c.req.formData();
      const file = form.get("file");
      if (!file || typeof file === "string")
        return c.json(
          { error: "bad_request", message: "No file uploaded" },
          400,
        );
      text = await file.text();
    } catch {
      return c.json(
        { error: "bad_request", message: "Invalid form data" },
        400,
      );
    }

    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length < 2)
      return c.json(
        {
          error: "bad_request",
          message: "CSV must have a header row and at least one data row",
        },
        400,
      );

    // Parse a single CSV line respecting quoted fields
    function parseCsvRow(line: string): string[] {
      const fields: string[] = [];
      let cur = "";
      let inQ = false;
      for (let k = 0; k < line.length; k++) {
        const ch = line[k];
        if (ch === '"') {
          if (inQ && line[k + 1] === '"') {
            cur += '"';
            k++;
          } else {
            inQ = !inQ;
          }
        } else if (ch === "," && !inQ) {
          fields.push(cur.trim());
          cur = "";
        } else {
          cur += ch;
        }
      }
      fields.push(cur.trim());
      return fields;
    }

    // Normalise header token — lowercase, strip quotes/spaces
    const normalise = (s: string) =>
      s
        .replace(/^["']|["']$/g, "")
        .trim()
        .toLowerCase();
    const headers = parseCsvRow(lines[0]).map(normalise);

    const col = (row: string[], candidates: string[]): string | null => {
      for (const c of candidates) {
        const idx = headers.indexOf(c);
        if (idx >= 0 && row[idx]) return row[idx] || null;
      }
      return null;
    };

    const VALID_TYPES = new Set([
      "lead",
      "customer",
      "investor",
      "advisor",
      "partner",
    ]);
    let imported = 0,
      skipped = 0;
    const errors: string[] = [];

    // Fetch existing emails to dedup
    const existing = await db
      .select({ email: contacts.email })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId));
    const existingEmails = new Set(
      existing.map((r) => r.email?.toLowerCase()).filter(Boolean),
    );

    const BATCH_LIMIT = 500;
    for (let i = 1; i < Math.min(lines.length, BATCH_LIMIT + 1); i++) {
      const row = parseCsvRow(lines[i]);

      // Support "name" column OR "first name" + "last name" (Folk, HubSpot, Google)
      let name = col(row, [
        "name",
        "full name",
        "fullname",
        "contact name",
        "display name",
      ]);
      if (!name) {
        const first = col(row, ["first name", "firstname", "given name"]);
        const last = col(row, [
          "last name",
          "lastname",
          "surname",
          "family name",
        ]);
        if (first || last) name = [first, last].filter(Boolean).join(" ");
      }
      if (!name) {
        errors.push(`Row ${i}: missing name`);
        continue;
      }

      const email = col(row, ["email", "email address", "e-mail"]);
      if (email && existingEmails.has(email.toLowerCase())) {
        skipped++;
        continue;
      }

      const rawType =
        col(row, ["type", "contact type", "role", "lifecycle stage"]) ?? "lead";
      const type = VALID_TYPES.has(rawType)
        ? (rawType as "lead" | "customer" | "investor" | "advisor" | "partner")
        : "lead";

      const rawLastContacted = col(row, [
        "last contacted",
        "last contact",
        "last contact date",
        "last touched",
        "last interaction",
        "last activity",
      ]);
      const lastContactedAt =
        rawLastContacted && !isNaN(Date.parse(rawLastContacted))
          ? new Date(rawLastContacted)
          : undefined;

      await db.insert(contacts).values({
        id: generateId(),
        workspaceId,
        name,
        email: email ?? null,
        company: col(row, [
          "company",
          "organization",
          "org",
          "company name",
          "associated company",
          "account name",
        ]),
        type,
        notes: col(row, ["notes", "note", "description", "memo"]),
        linkedinUrl: col(row, [
          "linkedin",
          "linkedin url",
          "linkedin profile",
          "linkedin profile url",
        ]),
        twitterHandle: col(row, [
          "twitter",
          "twitter handle",
          "x",
          "x handle",
          "twitter url",
          "x url",
        ]),
        lastContactedAt,
      });
      if (email) existingEmails.add(email.toLowerCase());
      imported++;
    }

    return c.json({ imported, skipped, errors: errors.slice(0, 10) });
  })
  .post("/", zValidator("json", createSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .insert(contacts)
      .values({ id: generateId(), workspaceId, ...body })
      .returning();
    return c.json({ data: row }, 201);
  })
  .get("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      );
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .patch("/:id", zValidator("json", updateSchema), async (c) => {
    const workspaceId = c.get("workspaceId");
    const body = c.req.valid("json");
    const [row] = await db
      .update(contacts)
      .set({ ...body, updatedAt: new Date() })
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: row });
  })
  .delete("/:id", async (c) => {
    const workspaceId = c.get("workspaceId");
    const [row] = await db
      .delete(contacts)
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    return c.json({ data: { id: row.id } });
  });
