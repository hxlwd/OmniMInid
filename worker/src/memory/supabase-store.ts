import type { SupabaseClient } from "@supabase/supabase-js";
import type { StoredMemory } from "../types";

export type MemoryWrite = {
  namespace: string[];
  key: string;
  kind: string;
  value: Record<string, unknown>;
  content: string;
};

export class SupabaseMemoryStore {
  constructor(
    private readonly supabase: SupabaseClient,
    private readonly userId: string
  ) {}

  async put(memory: MemoryWrite): Promise<void> {
    const namespacePath = memory.namespace.join("/");
    await this.supabase.from("memory_store_items").upsert(
      {
        user_id: this.userId,
        namespace: memory.namespace,
        namespace_path: namespacePath,
        key: memory.key,
        kind: memory.kind,
        value: memory.value,
        content: memory.content
      },
      {
        onConflict: "user_id,namespace_path,key"
      }
    );
  }

  async search(input: { namespacePrefix: string[]; query?: string; limit?: number }): Promise<StoredMemory[]> {
    const namespacePath = input.namespacePrefix.join("/");
    let query = this.supabase
      .from("memory_store_items")
      .select("key, namespace, value, content, kind, created_at, updated_at")
      .eq("user_id", this.userId)
      .like("namespace_path", `${namespacePath}%`)
      .order("updated_at", { ascending: false })
      .limit(input.limit ?? 8);

    if (input.query?.trim()) {
      query = query.ilike("content", `%${input.query.trim()}%`);
    }

    const { data } = await query;

    return (data ?? []).map((item: any) => ({
      key: item.key,
      namespace: item.namespace ?? [],
      value: item.value ?? {},
      content: item.content ?? "",
      kind: item.kind ?? "memory",
      createdAt: item.created_at,
      updatedAt: item.updated_at
    }));
  }
}

export function userNamespace(userId: string, label: string): string[] {
  return [`user:${userId}`, label];
}
