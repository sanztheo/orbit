import { describe, it, expect } from "vitest";
import {
  contactCreateSchema,
  contactUpdateSchema,
} from "../schemas/contact.js";
import { dealCreateSchema, dealUpdateSchema } from "../schemas/deal.js";
import { taskCreateSchema, taskUpdateSchema } from "../schemas/task.js";

// ── Contact ────────────────────────────────────────────────────────────────

describe("contactCreateSchema", () => {
  it("accepts valid minimal input", () => {
    expect(contactCreateSchema.safeParse({ name: "Alice" }).success).toBe(true);
  });

  it("rejects empty name", () => {
    expect(contactCreateSchema.safeParse({ name: "" }).success).toBe(false);
  });

  it("rejects missing name", () => {
    expect(contactCreateSchema.safeParse({}).success).toBe(false);
  });

  it("accepts valid email", () => {
    const r = contactCreateSchema.safeParse({ name: "A", email: "a@b.com" });
    expect(r.success).toBe(true);
  });

  it("rejects invalid email", () => {
    expect(
      contactCreateSchema.safeParse({ name: "A", email: "not-an-email" })
        .success,
    ).toBe(false);
  });

  it("rejects invalid linkedinUrl", () => {
    expect(
      contactCreateSchema.safeParse({ name: "A", linkedinUrl: "not-a-url" })
        .success,
    ).toBe(false);
  });

  it("accepts null linkedinUrl", () => {
    const r = contactCreateSchema.safeParse({ name: "A", linkedinUrl: null });
    expect(r.success).toBe(true);
  });

  it("rejects unknown type", () => {
    expect(
      contactCreateSchema.safeParse({ name: "A", type: "alien" }).success,
    ).toBe(false);
  });

  it("accepts all valid types", () => {
    for (const type of ["lead", "customer", "investor", "advisor", "partner"]) {
      expect(
        contactCreateSchema.safeParse({ name: "A", type }).success,
        `type "${type}" should be valid`,
      ).toBe(true);
    }
  });
});

describe("contactUpdateSchema", () => {
  it("accepts empty object (full partial)", () => {
    expect(contactUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("rejects cadenceDays = 0", () => {
    expect(contactUpdateSchema.safeParse({ cadenceDays: 0 }).success).toBe(
      false,
    );
  });

  it("rejects cadenceDays > 365", () => {
    expect(contactUpdateSchema.safeParse({ cadenceDays: 366 }).success).toBe(
      false,
    );
  });

  it("accepts cadenceDays = null", () => {
    expect(contactUpdateSchema.safeParse({ cadenceDays: null }).success).toBe(
      true,
    );
  });

  it("accepts valid lastContactedAt ISO datetime", () => {
    const r = contactUpdateSchema.safeParse({
      lastContactedAt: "2024-01-15T10:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.lastContactedAt).toBeInstanceOf(Date);
  });

  it("rejects lastContactedAt non-datetime string", () => {
    expect(
      contactUpdateSchema.safeParse({ lastContactedAt: "2024-01-15" }).success,
    ).toBe(false);
  });
});

// ── Deal ──────────────────────────────────────────────────────────────────

describe("dealCreateSchema", () => {
  it("accepts valid minimal input", () => {
    expect(dealCreateSchema.safeParse({ title: "ACME deal" }).success).toBe(
      true,
    );
  });

  it("rejects empty title", () => {
    expect(dealCreateSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects missing title", () => {
    expect(dealCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects negative value", () => {
    expect(dealCreateSchema.safeParse({ title: "X", value: -1 }).success).toBe(
      false,
    );
  });

  it("accepts value = 0", () => {
    expect(dealCreateSchema.safeParse({ title: "X", value: 0 }).success).toBe(
      true,
    );
  });

  it("rejects probability > 100", () => {
    expect(
      dealCreateSchema.safeParse({ title: "X", probability: 101 }).success,
    ).toBe(false);
  });

  it("rejects probability < 0", () => {
    expect(
      dealCreateSchema.safeParse({ title: "X", probability: -1 }).success,
    ).toBe(false);
  });

  it("accepts probability = 0 and = 100", () => {
    expect(
      dealCreateSchema.safeParse({ title: "X", probability: 0 }).success,
    ).toBe(true);
    expect(
      dealCreateSchema.safeParse({ title: "X", probability: 100 }).success,
    ).toBe(true);
  });

  it("rejects unknown stage", () => {
    expect(
      dealCreateSchema.safeParse({ title: "X", stage: "unknown_stage" })
        .success,
    ).toBe(false);
  });

  it("accepts all valid stages", () => {
    for (const stage of [
      "prospect",
      "contacted",
      "meeting",
      "proposal",
      "negotiation",
      "closed_won",
      "closed_lost",
    ]) {
      expect(
        dealCreateSchema.safeParse({ title: "X", stage }).success,
        `stage "${stage}" should be valid`,
      ).toBe(true);
    }
  });

  it("rejects unknown pipelineType", () => {
    expect(
      dealCreateSchema.safeParse({ title: "X", pipelineType: "vendor" })
        .success,
    ).toBe(false);
  });

  it("accepts all valid pipelineTypes", () => {
    for (const pipelineType of ["sales", "fundraising", "partnership"]) {
      expect(
        dealCreateSchema.safeParse({ title: "X", pipelineType }).success,
        `pipelineType "${pipelineType}" should be valid`,
      ).toBe(true);
    }
  });

  it("transforms expectedCloseAt to Date", () => {
    const r = dealCreateSchema.safeParse({
      title: "X",
      expectedCloseAt: "2025-12-31T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.expectedCloseAt).toBeInstanceOf(Date);
  });
});

describe("dealUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(dealUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("still validates probability range when present", () => {
    expect(dealUpdateSchema.safeParse({ probability: 150 }).success).toBe(
      false,
    );
  });
});

// ── Task ──────────────────────────────────────────────────────────────────

describe("taskCreateSchema", () => {
  it("accepts valid minimal input", () => {
    expect(taskCreateSchema.safeParse({ title: "Build X" }).success).toBe(true);
  });

  it("rejects empty title", () => {
    expect(taskCreateSchema.safeParse({ title: "" }).success).toBe(false);
  });

  it("rejects missing title", () => {
    expect(taskCreateSchema.safeParse({}).success).toBe(false);
  });

  it("rejects unknown status", () => {
    expect(
      taskCreateSchema.safeParse({ title: "X", status: "wont_do" }).success,
    ).toBe(false);
  });

  it("accepts all valid statuses", () => {
    for (const status of ["todo", "in_progress", "done", "cancelled"]) {
      expect(
        taskCreateSchema.safeParse({ title: "X", status }).success,
        `status "${status}" should be valid`,
      ).toBe(true);
    }
  });

  it("rejects unknown priority", () => {
    expect(
      taskCreateSchema.safeParse({ title: "X", priority: "p4" }).success,
    ).toBe(false);
  });

  it("accepts all valid priorities", () => {
    for (const priority of ["p0", "p1", "p2", "p3"]) {
      expect(
        taskCreateSchema.safeParse({ title: "X", priority }).success,
        `priority "${priority}" should be valid`,
      ).toBe(true);
    }
  });

  it("transforms dueAt to Date", () => {
    const r = taskCreateSchema.safeParse({
      title: "X",
      dueAt: "2025-06-01T09:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.dueAt).toBeInstanceOf(Date);
  });
});

describe("taskUpdateSchema", () => {
  it("accepts empty object", () => {
    expect(taskUpdateSchema.safeParse({}).success).toBe(true);
  });

  it("accepts completedAt datetime", () => {
    const r = taskUpdateSchema.safeParse({
      completedAt: "2025-01-01T00:00:00.000Z",
    });
    expect(r.success).toBe(true);
    if (r.success) expect(r.data.completedAt).toBeInstanceOf(Date);
  });

  it("rejects completedAt non-datetime", () => {
    expect(taskUpdateSchema.safeParse({ completedAt: "today" }).success).toBe(
      false,
    );
  });
});
