import type { SupabaseClient } from "@supabase/supabase-js";
import type { OmniMessage, ThreadMemoryState, ToolExecutionEvent } from "../types";

export function createEmptyThreadState(threadId: string): ThreadMemoryState {
  return {
    threadId,
    messages: [],
    attachmentIds: [],
    toolResults: [],
    pendingActionIds: [],
    updatedAt: new Date().toISOString()
  };
}

export class SupabaseThreadCheckpointer {
  constructor(private readonly supabase: SupabaseClient) {}

  async getLatest(userId: string, threadId: string): Promise<ThreadMemoryState> {
    const { data, error } = await this.supabase
      .from("langgraph_checkpoints")
      .select("state")
      .eq("user_id", userId)
      .eq("thread_id", threadId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error || !data?.state) {
      return createEmptyThreadState(threadId);
    }

    return {
      ...createEmptyThreadState(threadId),
      ...(data.state as Partial<ThreadMemoryState>)
    };
  }

  async put(input: {
    userId: string;
    threadId: string;
    state: ThreadMemoryState;
    source: "chat" | "tool" | "system";
  }): Promise<void> {
    const { data } = await this.supabase
      .from("langgraph_checkpoints")
      .select("version")
      .eq("user_id", input.userId)
      .eq("thread_id", input.threadId)
      .order("version", { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextVersion = Number(data?.version ?? 0) + 1;

    await this.supabase.from("langgraph_checkpoints").insert({
      user_id: input.userId,
      thread_id: input.threadId,
      version: nextVersion,
      source: input.source,
      state: {
        ...input.state,
        messages: trimMessages(input.state.messages),
        toolResults: trimToolResults(input.state.toolResults),
        updatedAt: new Date().toISOString()
      }
    });
  }
}

function trimMessages(messages: OmniMessage[]): OmniMessage[] {
  return messages.slice(-30);
}

function trimToolResults(events: ToolExecutionEvent[]): ToolExecutionEvent[] {
  return events.slice(-20);
}
