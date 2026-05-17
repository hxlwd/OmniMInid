import { Hono } from "hono";
import { z } from "zod";
import { ApiError } from "../http";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AppContext } from "../types";

export const searchRoutes = new Hono<AppContext>();

searchRoutes.get("/", async (c) => {
  const user = c.get("user");
  const query = z.string().trim().min(1).max(300).parse(c.req.query("q") ?? "");
  const supabase = c.get("supabase");
  const memoryStore = new SupabaseMemoryStore(supabase, user.id);

  const [{ data: chunks, error }, memories] = await Promise.all([
    supabase
      .from("asset_chunks")
      .select("id, asset_id, content, source_ref, created_at")
      .eq("user_id", user.id)
      .ilike("content", `%${query}%`)
      .limit(10),
    memoryStore.search({ namespacePrefix: [`user:${user.id}`], query, limit: 8 })
  ]);

  if (error) {
    throw new ApiError(502, "search_error", "Failed to search knowledge base.", error);
  }

  return c.json({
    query,
    chunks: chunks ?? [],
    memories
  });
});
