import { createMiddleware } from "hono/factory";
import { ApiError } from "./http";
import { createSupabaseAdminClient, createSupabaseUserClient } from "./supabase";
import type { AppContext } from "./types";

export function getBearerToken(header: string | undefined): string | null {
  if (!header) {
    return null;
  }

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match?.[1]?.trim() || null;
}

export const authMiddleware = createMiddleware<AppContext>(async (c, next) => {
  const bearerToken = getBearerToken(c.req.header("Authorization"));
  if (!bearerToken) {
    throw new ApiError(401, "unauthorized", "Missing Authorization bearer token.");
  }

  const supabase = createSupabaseUserClient(c.env, bearerToken);
  const admin = createSupabaseAdminClient(c.env);
  const { data, error } = await supabase.auth.getUser(bearerToken);

  if (error || !data.user) {
    throw new ApiError(401, "unauthorized", "Invalid or expired Supabase access token.");
  }

  c.set("bearerToken", bearerToken);
  c.set("supabase", supabase);
  c.set("admin", admin);
  c.set("user", {
    id: data.user.id,
    email: data.user.email ?? null
  });

  await next();
});
