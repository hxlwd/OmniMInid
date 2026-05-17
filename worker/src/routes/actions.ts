import { Hono } from "hono";
import { z } from "zod";
import { executeApprovedAction } from "../agent/tools";
import { ApiError } from "../http";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

export const actionRoutes = new Hono<AppContext>();

actionRoutes.post("/:id/approve", async (c) => {
  const id = z.string().uuid().parse(c.req.param("id"));
  const user = c.get("user");
  const supabase = c.get("supabase");
  const { data: action, error } = await supabase
    .from("agent_actions")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .eq("status", "pending")
    .maybeSingle();

  if (error) {
    throw new ApiError(502, "action_lookup_error", "Failed to load action.", error);
  }
  if (!action) {
    throw new ApiError(404, "action_not_found", "Action was not found.");
  }

  const result = await executeApprovedAction(action, {
    env: c.env,
    user,
    supabase,
    admin: c.get("admin"),
    memoryStore: new SupabaseMemoryStore(supabase, user.id)
  });

  await supabase.from("agent_actions").update({ status: "approved", result }).eq("id", id).eq("user_id", user.id);

  return c.json({ actionId: id, status: "approved", result });
});

actionRoutes.post("/:id/reject", async (c) => {
  const id = z.string().uuid().parse(c.req.param("id"));
  const user = c.get("user");
  const { data } = await c
    .get("supabase")
    .from("agent_actions")
    .update({ status: "rejected" })
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, status")
    .maybeSingle();

  if (!data) {
    throw new ApiError(404, "action_not_found", "Action was not found.");
  }

  return c.json({ action: data });
});
