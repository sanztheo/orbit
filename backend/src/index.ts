import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { logger } from "hono/logger";
import { requireAuth } from "./middleware/auth.js";
import { contactsRouter } from "./routes/contacts.js";
import { dealsRouter } from "./routes/deals.js";
import { tasksRouter } from "./routes/tasks.js";

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
app.route("/api/contacts", contactsRouter);
app.route("/api/deals", dealsRouter);
app.route("/api/tasks", tasksRouter);

const port = Number(process.env.PORT ?? 3001);
serve({ fetch: app.fetch, port }, () => {
  console.log(`Backend running on http://localhost:${port}`);
});
