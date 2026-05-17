import { Hono } from "hono";
import { z } from "zod";
import { ApiError, parseJsonBody } from "../http";
import type { AppContext } from "../types";

const InitUploadSchema = z.object({
  notebookId: z.string().uuid().optional(),
  title: z.string().trim().min(1).max(180),
  mimeType: z.string().trim().min(1).max(120),
  sizeBytes: z.number().int().nonnegative().optional(),
  sourceType: z.enum(["handwriting", "image", "audio", "document", "text"]).default("document")
});

export const assetRoutes = new Hono<AppContext>();

assetRoutes.get("/", async (c) => {
  const user = c.get("user");
  const { data, error } = await c
    .get("supabase")
    .from("learning_assets")
    .select("id, notebook_id, title, source_type, mime_type, size_bytes, status, storage_path, created_at, updated_at")
    .eq("user_id", user.id)
    .neq("status", "archived")
    .order("updated_at", { ascending: false })
    .limit(100);

  if (error) {
    throw new ApiError(502, "asset_list_error", "Failed to load assets.", error);
  }

  return c.json({ assets: data ?? [] });
});

assetRoutes.post("/init-upload", async (c) => {
  const body = await parseJsonBody(c, InitUploadSchema);
  const user = c.get("user");
  const bucket = c.env.SUPABASE_STORAGE_BUCKET ?? "learning-assets";
  const assetId = crypto.randomUUID();
  const extension = extensionFromMime(body.mimeType);
  const storagePath = `${user.id}/${assetId}${extension}`;

  const { data: asset, error } = await c
    .get("supabase")
    .from("learning_assets")
    .insert({
      id: assetId,
      user_id: user.id,
      notebook_id: body.notebookId ?? null,
      title: body.title,
      source_type: body.sourceType,
      mime_type: body.mimeType,
      size_bytes: body.sizeBytes ?? null,
      storage_bucket: bucket,
      storage_path: storagePath,
      status: "uploading"
    })
    .select("id, title, storage_bucket, storage_path, status")
    .single();

  if (error) {
    throw new ApiError(502, "asset_create_error", "Failed to create upload asset.", error);
  }

  const { data: signedUpload, error: uploadError } = await c
    .get("supabase")
    .storage.from(bucket)
    .createSignedUploadUrl(storagePath);

  if (uploadError) {
    throw new ApiError(502, "signed_upload_error", "Failed to create signed upload URL.", uploadError);
  }

  return c.json(
    {
      asset,
      upload: signedUpload
    },
    201
  );
});

assetRoutes.post("/:id/ingest", async (c) => {
  const assetId = z.string().uuid().parse(c.req.param("id"));
  const user = c.get("user");
  const supabase = c.get("supabase");

  const { data: asset, error } = await supabase
    .from("learning_assets")
    .update({ status: "queued" })
    .eq("id", assetId)
    .eq("user_id", user.id)
    .select("id, status")
    .maybeSingle();

  if (error) {
    throw new ApiError(502, "asset_ingest_error", "Failed to queue asset ingestion.", error);
  }
  if (!asset) {
    throw new ApiError(404, "asset_not_found", "Asset was not found.");
  }

  await c.env.INGEST_QUEUE?.send({
    assetId,
    userId: user.id,
    reason: "upload"
  });

  return c.json({ asset, queued: Boolean(c.env.INGEST_QUEUE) });
});

function extensionFromMime(mimeType: string): string {
  if (mimeType.includes("png")) return ".png";
  if (mimeType.includes("jpeg") || mimeType.includes("jpg")) return ".jpg";
  if (mimeType.includes("webp")) return ".webp";
  if (mimeType.includes("pdf")) return ".pdf";
  if (mimeType.includes("mpeg") || mimeType.includes("mp3")) return ".mp3";
  if (mimeType.includes("wav")) return ".wav";
  return "";
}
