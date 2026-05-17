import { Hono } from "hono";
import { z } from "zod";
import { parseJsonBody } from "../http";
import { agentTools } from "../agent/tools";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

const GeneratePracticeSchema = z.object({
  topic: z.string().trim().min(1).max(160)
});

const AttemptSchema = z.object({
  practiceItemId: z.string().uuid(),
  answer: z.string().trim().max(4000),
  isCorrect: z.boolean().optional(),
  confidence: z.number().int().min(1).max(5).optional()
});

export const practiceRoutes = new Hono<AppContext>();

practiceRoutes.post("/generate", async (c) => {
  const body = await parseJsonBody(c, GeneratePracticeSchema);
  const tool = agentTools.find((candidate) => candidate.name === "generate_practice");
  const result = await tool?.execute(
    { topic: body.topic },
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

practiceRoutes.post("/attempts", async (c) => {
  const body = await parseJsonBody(c, AttemptSchema);
  const user = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("practice_attempts")
    .insert({
      user_id: user.id,
      practice_item_id: body.practiceItemId,
      answer: body.answer,
      is_correct: body.isCorrect ?? null,
      confidence: body.confidence ?? null
    })
    .select("id, practice_item_id, is_correct, confidence, created_at")
    .single();

  if (error) {
    return c.json({ error: { code: "attempt_create_error", message: error.message } }, 502);
  }

  return c.json({ attempt: data }, 201);
});
