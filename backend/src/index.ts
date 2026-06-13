import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requireAuth } from "./middleware/auth.js";
import { requireWorkspace } from "./middleware/workspace.js";
import { contactsRouter } from "./routes/contacts.js";
import { dealsRouter } from "./routes/deals.js";
import { tasksRouter } from "./routes/tasks.js";
import { aiRouter } from "./routes/ai.js";
import { statsRouter } from "./routes/stats.js";
import { activitiesRouter } from "./routes/activities.js";
import { exportRouter } from "./routes/export.js";
import { webhooksRouter } from "./routes/webhooks.js";
import { searchRouter } from "./routes/search.js";
import { workspaceRouter } from "./routes/workspace.js";

const app = new Hono();

app.use(logger());
app.use(
  cors({
    origin: process.env.FRONTEND_URL ?? "http://localhost:3000",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.use("/api/*", requireAuth);
app.use("/api/*", requireWorkspace);
app.route("/api/contacts", contactsRouter);
app.route("/api/deals", dealsRouter);
app.route("/api/tasks", tasksRouter);
app.route("/api/ai", aiRouter);
app.route("/api/stats", statsRouter);
app.route("/api/activities", activitiesRouter);
app.route("/api/export", exportRouter);
app.route("/api/webhooks", webhooksRouter);
app.route("/api/search", searchRouter);
app.route("/api/workspace", workspaceRouter);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
