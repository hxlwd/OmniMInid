import { Hono } from "hono";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

export const memoryRoutes = new Hono<AppContext>();

memoryRoutes.get("/", async (c) => {
  const user = c.get("user");
  const memoryStore = new SupabaseMemoryStore(c.get("supabase"), user.id);
  const memories = await memoryStore.search({
    namespacePrefix: [`user:${user.id}`],
    limit: Math.min(Math.max(Number(c.req.query("limit") ?? 30), 1), 100)
  });

  return c.json({ memories });
});
