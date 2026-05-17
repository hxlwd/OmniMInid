import { Hono } from "hono";
import { cors } from "hono/cors";
import { authMiddleware } from "./auth";
import { ApiError, apiErrorResponse } from "./http";
import { handleIngestQueue } from "./queue";
import { actionRoutes } from "./routes/actions";
import { assetRoutes } from "./routes/assets";
import { chatRoutes } from "./routes/chat";
import { insightRoutes } from "./routes/insights";
import { memoryRoutes } from "./routes/memories";
import { notebookRoutes } from "./routes/notebooks";
import { practiceRoutes } from "./routes/practice";
import { searchRoutes } from "./routes/search";
import { studyPlanRoutes } from "./routes/study-plans";
import type { AppContext, Env, IngestQueueMessage } from "./types";

const app = new Hono<AppContext>();

app.use(
  "*",
  cors({
    origin: "*",
    allowHeaders: ["Authorization", "Content-Type"],
    allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"]
  })
);

app.onError((error) => {
  if (error instanceof ApiError) {
    return apiErrorResponse(error);
  }

  if (error instanceof Error && error.name === "ZodError") {
    return apiErrorResponse(new ApiError(400, "validation_error", "Request parameters did not match the expected shape."));
  }

  console.error(error);
  return apiErrorResponse(new ApiError(500, "internal_error", "Unexpected server error."));
});

app.get("/health", (c) =>
  c.json({
    ok: true,
    service: "omnimind-worker-api",
    version: "0.1.0"
  })
);

const v1 = new Hono<AppContext>();
v1.use("*", authMiddleware);
v1.route("/chat", chatRoutes);
v1.route("/notebooks", notebookRoutes);
v1.route("/assets", assetRoutes);
v1.route("/search", searchRoutes);
v1.route("/practice", practiceRoutes);
v1.route("/study-plans", studyPlanRoutes);
v1.route("/insights", insightRoutes);
v1.route("/memories", memoryRoutes);
v1.route("/actions", actionRoutes);

app.route("/v1", v1);

export default {
  fetch(request: Request, env: Env, ctx: ExecutionContext) {
    return app.fetch(request, env, ctx);
  },
  queue(batch: MessageBatch<IngestQueueMessage>, env: Env) {
    return handleIngestQueue(batch, env);
  }
} satisfies ExportedHandler<Env, IngestQueueMessage>;
