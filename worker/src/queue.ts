import { embedText } from "./agent/model";
import { SupabaseMemoryStore, userNamespace } from "./memory/supabase-store";
import { createSupabaseAdminClient } from "./supabase";
import type { Env, IngestQueueMessage } from "./types";

export async function handleIngestQueue(batch: MessageBatch<IngestQueueMessage>, env: Env): Promise<void> {
  const admin = createSupabaseAdminClient(env);

  for (const message of batch.messages) {
    await processAssetIngestion(admin, env, message.body);
  }
}

async function processAssetIngestion(admin: any, env: Env, body: IngestQueueMessage): Promise<void> {
  const { data: asset } = await admin
    .from("learning_assets")
    .select("id, user_id, title, source_type, mime_type, storage_bucket, storage_path")
    .eq("id", body.assetId)
    .eq("user_id", body.userId)
    .maybeSingle();

  if (!asset) {
    return;
  }

  await admin.from("learning_assets").update({ status: "processing" }).eq("id", asset.id).eq("user_id", asset.user_id);

  const content = await extractAssetText(admin, asset);
  const embedding = await embedText(env, content);

  await admin.from("asset_chunks").insert({
    user_id: asset.user_id,
    asset_id: asset.id,
    content,
    source_ref: {
      type: asset.source_type,
      storagePath: asset.storage_path
    },
    embedding
  });

  const memoryStore = new SupabaseMemoryStore(admin, asset.user_id);
  await memoryStore.put({
    namespace: userNamespace(asset.user_id, "assets"),
    key: asset.id,
    kind: "asset_summary",
    value: {
      assetId: asset.id,
      title: asset.title,
      sourceType: asset.source_type
    },
    content: `资料「${asset.title}」已入库。类型：${asset.source_type}。摘要：${content.slice(0, 240)}`
  });

  await admin.from("learning_assets").update({ status: "ready" }).eq("id", asset.id).eq("user_id", asset.user_id);
}

async function extractAssetText(admin: any, asset: any): Promise<string> {
  if (asset.mime_type?.startsWith("text/")) {
    const { data } = await admin.storage.from(asset.storage_bucket).download(asset.storage_path);
    if (data) {
      return await data.text();
    }
  }

  if (asset.source_type === "audio") {
    return `音频资料「${asset.title}」等待接入转写服务。当前已保存文件来源，可用于后续转写和索引。`;
  }

  if (asset.source_type === "handwriting" || asset.source_type === "image") {
    return `图片/手写资料「${asset.title}」等待接入 OCR 服务。当前已保存文件来源，可用于后续识别和索引。`;
  }

  return `资料「${asset.title}」已上传，等待专用解析器提取正文。`;
}
