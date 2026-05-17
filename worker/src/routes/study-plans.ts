import { Hono } from "hono";
import { z } from "zod";
import { agentTools } from "../agent/tools";
import { parseJsonBody } from "../http";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

const CreatePlanSchema = z.object({
  title: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2000)
});

export const studyPlanRoutes = new Hono<AppContext>();

studyPlanRoutes.get("/", async (c) => {
  const user = c.get("user");
  const { data } = await c
    .get("supabase")
    .from("study_plans")
    .select("id, title, objective, status, created_at, updated_at, study_tasks(id, title, status, position, estimated_minutes)")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  return c.json({ plans: data ?? [] });
});

studyPlanRoutes.post("/", async (c) => {
  const body = await parseJsonBody(c, CreatePlanSchema);
  const tool = agentTools.find((candidate) => candidate.name === "create_study_plan");
  const result = await tool?.execute(
    body,
    {
      env: c.env,
      user: c.get("user"),
      supabase: c.get("supabase"),
      admin: c.get("admin"),
      memoryStore: new SupabaseMemoryStore(c.get("supabase"), c.get("user").id)
    }
  );

  return c.json(result, 201);
});
