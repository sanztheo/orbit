import { zValidator } from "@hono/zod-validator";
import {
  and,
  asc,
  count,
  desc,
  eq,
  ilike,
  isNotNull,
  isNull,
  lt,
  ne,
  or,
  sql,
} from "drizzle-orm";
import { Hono } from "hono";
import { z } from "zod";
import { db, contacts, deals } from "../db/index.js";
import { generateId } from "../lib/ids.js";
import { fireWebhook } from "../lib/fire-webhook.js";
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
  tags: z.array(z.string().min(1).max(50)).max(20).optional(),
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
    const sort = c.req.query("sort") ?? "name";
    const company = c.req.query("company");
    const excludeId = c.req.query("excludeId");
    const tag = c.req.query("tag");
    const hasFollowUp = c.req.query("hasFollowUp") === "1";
    const limitParam = c.req.query("limit");
    const pageParam = c.req.query("page");
    const pageSize = limitParam
      ? Math.min(parseInt(limitParam, 10) || 50, 200)
      : undefined;
    const page = pageParam ? Math.max(parseInt(pageParam, 10) || 1, 1) : 1;
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
    const companyFilter = company
      ? ilike(contacts.company, company)
      : undefined;
    const excludeFilter = excludeId ? ne(contacts.id, excludeId) : undefined;

    const staleFilter = stale
      ? or(
          isNull(contacts.lastContactedAt),
          lt(contacts.lastContactedAt, oneEightyDaysAgo),
        )
      : undefined;
    const tagFilter = tag ? sql`${tag} = ANY(${contacts.tags})` : undefined;
    const followUpFilter = hasFollowUp
      ? isNotNull(contacts.nextFollowUpAt)
      : undefined;

    const orderBy = (() => {
      switch (sort) {
        case "stale":
          return [sql`${contacts.lastContactedAt} ASC NULLS FIRST`];
        case "newest":
          return [desc(contacts.createdAt)];
        case "recently_contacted":
          return [sql`${contacts.lastContactedAt} DESC NULLS LAST`];
        case "priority":
          return [
            sql`COALESCE((SELECT SUM(${deals.value}) FROM ${deals} WHERE ${deals.contactId} = ${contacts.id} AND ${deals.workspaceId} = ${contacts.workspaceId}), 0) DESC`,
          ];
        case "next_follow_up":
          return [sql`${contacts.nextFollowUpAt} ASC NULLS LAST`];
        default:
          return [asc(contacts.name)];
      }
    })();

    const whereClause = and(
      eq(contacts.workspaceId, workspaceId),
      searchFilter,
      typeFilter,
      staleFilter,
      companyFilter,
      excludeFilter,
      tagFilter,
      followUpFilter,
    );

    let query = db
      .select()
      .from(contacts)
      .where(whereClause)
      .orderBy(...orderBy);
    if (pageSize) {
      query = query
        .limit(pageSize)
        .offset((page - 1) * pageSize) as typeof query;
    }

    const [rows, countResult] = await Promise.all([
      query,
      pageSize
        ? db.select({ total: count() }).from(contacts).where(whereClause)
        : Promise.resolve(null),
    ]);

    const total = countResult ? countResult[0].total : rows.length;
    return c.json({
      data: rows,
      total,
      ...(pageSize && {
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      }),
    });
  })
  .get("/export", async (c) => {
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
    const tag = c.req.query("tag");
    const oneEightyDaysAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const rows = await db
      .select()
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          search
            ? or(
                ilike(contacts.name, `%${search}%`),
                ilike(contacts.email, `%${search}%`),
                ilike(contacts.company, `%${search}%`),
              )
            : undefined,
          type ? eq(contacts.type, type) : undefined,
          stale
            ? or(
                isNull(contacts.lastContactedAt),
                lt(contacts.lastContactedAt, oneEightyDaysAgo),
              )
            : undefined,
          tag ? sql`${tag} = ANY(${contacts.tags})` : undefined,
        ),
      )
      .orderBy(asc(contacts.name));

    const header =
      "name,email,company,type,tags,notes,linkedinUrl,twitterHandle,cadenceDays,lastContactedAt,nextFollowUpAt,priorityScore,createdAt";
    const escape = (v: string | null | undefined) =>
      v == null ? "" : `"${v.replace(/"/g, '""')}"`;
    const lines = rows.map((r) =>
      [
        escape(r.name),
        escape(r.email),
        escape(r.company),
        escape(r.type),
        escape(r.tags.join(";")),
        escape(r.notes),
        escape(r.linkedinUrl),
        escape(r.twitterHandle),
        r.cadenceDays ?? "",
        r.lastContactedAt ? r.lastContactedAt.toISOString() : "",
        r.nextFollowUpAt ? r.nextFollowUpAt.toISOString() : "",
        r.priorityScore ?? "",
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

    // Dedup by email (exact) then by name (case-insensitive)
    const [byEmail] = body.email
      ? await db
          .select({ id: contacts.id, name: contacts.name })
          .from(contacts)
          .where(
            and(
              eq(contacts.workspaceId, workspaceId),
              eq(contacts.email, body.email),
            ),
          )
          .limit(1)
      : [undefined];
    if (byEmail) {
      return c.json(
        {
          error: "duplicate_email",
          message: `A contact with this email already exists: ${byEmail.name}`,
          existingId: byEmail.id,
        },
        409,
      );
    }

    const [byName] = await db
      .select({ id: contacts.id, name: contacts.name })
      .from(contacts)
      .where(
        and(
          eq(contacts.workspaceId, workspaceId),
          ilike(contacts.name, body.name.trim()),
        ),
      )
      .limit(1);
    if (byName) {
      return c.json(
        {
          error: "duplicate_name",
          message: `A contact named "${byName.name}" already exists`,
          existingId: byName.id,
        },
        409,
      );
    }
    const [row] = await db
      .insert(contacts)
      .values({ id: generateId(), workspaceId, ...body })
      .returning();
    fireWebhook(workspaceId, "contact.created", {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      type: row.type,
    });
    return c.json({ data: row }, 201);
  })
  .get("/tags", async (c) => {
    const workspaceId = c.get("workspaceId");
    const rows = await db
      .select({ tag: sql<string>`unnest(${contacts.tags})` })
      .from(contacts)
      .where(eq(contacts.workspaceId, workspaceId));
    const unique = [...new Set(rows.map((r) => r.tag))].sort();
    return c.json({ data: unique });
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

    // Auto-compute nextFollowUpAt from lastContactedAt + cadenceDays
    // unless the caller explicitly sets nextFollowUpAt
    let autoFollowUp: { nextFollowUpAt: Date } | undefined;
    if (
      "nextFollowUpAt" in body === false &&
      ("lastContactedAt" in body || "cadenceDays" in body)
    ) {
      const [existing] = await db
        .select({
          lastContactedAt: contacts.lastContactedAt,
          cadenceDays: contacts.cadenceDays,
        })
        .from(contacts)
        .where(
          and(
            eq(contacts.id, c.req.param("id")),
            eq(contacts.workspaceId, workspaceId),
          ),
        );
      if (existing) {
        const lastContacted = body.lastContactedAt ?? existing.lastContactedAt;
        const cadence = body.cadenceDays ?? existing.cadenceDays;
        if (lastContacted && cadence) {
          const due = new Date(lastContacted);
          due.setDate(due.getDate() + cadence);
          autoFollowUp = { nextFollowUpAt: due };
        }
      }
    }

    const [row] = await db
      .update(contacts)
      .set({ ...body, ...autoFollowUp, updatedAt: new Date() })
      .where(
        and(
          eq(contacts.id, c.req.param("id")),
          eq(contacts.workspaceId, workspaceId),
        ),
      )
      .returning();
    if (!row)
      return c.json({ error: "not_found", message: "Contact not found" }, 404);
    fireWebhook(workspaceId, "contact.updated", {
      id: row.id,
      name: row.name,
      email: row.email,
      company: row.company,
      type: row.type,
    });
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
