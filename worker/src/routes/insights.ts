import { Hono } from "hono";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

export const insightRoutes = new Hono<AppContext>();

insightRoutes.get("/weaknesses", async (c) => {
  const user = c.get("user");
  const memoryStore = new SupabaseMemoryStore(c.get("supabase"), user.id);
  const weaknesses = await memoryStore.search({
    namespacePrefix: [`user:${user.id}`, "weaknesses"],
    limit: 20
  });

  return c.json({ weaknesses });
});
