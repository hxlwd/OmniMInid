import { Hono } from "hono";
import { z } from "zod";
import { ApiError, parseJsonBody } from "../http";
import type { AppContext } from "../types";

const NotebookSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).optional()
});

export const notebookRoutes = new Hono<AppContext>();

notebookRoutes.get("/", async (c) => {
  const user = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("notebooks")
    .select("id, title, description, source, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false });

  if (error) {
    throw new ApiError(502, "notebook_list_error", "Failed to load notebooks.", error);
  }

  return c.json({ notebooks: data ?? [] });
});

notebookRoutes.post("/", async (c) => {
  const body = await parseJsonBody(c, NotebookSchema);
  const user = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("notebooks")
    .insert({
      user_id: user.id,
      title: body.title,
      description: body.description ?? null,
      source: "manual"
    })
    .select("id, title, description, source, created_at, updated_at")
    .single();

  if (error) {
    throw new ApiError(502, "notebook_create_error", "Failed to create notebook.", error);
  }

  return c.json({ notebook: data }, 201);
});

notebookRoutes.patch("/:id", async (c) => {
  const id = z.string().uuid().parse(c.req.param("id"));
  const body = await parseJsonBody(c, NotebookSchema.partial());
  const user = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("notebooks")
    .update(body)
    .eq("id", id)
    .eq("user_id", user.id)
    .select("id, title, description, source, created_at, updated_at")
    .maybeSingle();

  if (error) {
    throw new ApiError(502, "notebook_update_error", "Failed to update notebook.", error);
  }
  if (!data) {
    throw new ApiError(404, "notebook_not_found", "Notebook was not found.");
  }

  return c.json({ notebook: data });
});
