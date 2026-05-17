import { Hono } from "hono";
import { z } from "zod";
import { runAgentTurn } from "../agent/graph";
import { parseJsonBody } from "../http";
import { SupabaseThreadCheckpointer } from "../memory/supabase-checkpointer";
import { SupabaseMemoryStore } from "../memory/supabase-store";
import { chunkText, sseEvent } from "../sse";
import type { AppContext } from "../types";

const ChatRequestSchema = z.object({
  threadId: z.string().uuid().optional(),
  message: z.string().trim().min(1).max(8000),
  attachmentIds: z.array(z.string().uuid()).default([])
});

export const chatRoutes = new Hono<AppContext>();

chatRoutes.post("/", async (c) => {
  const body = await parseJsonBody(c, ChatRequestSchema);
  const user = c.get("user");
  const supabase = c.get("supabase");
  const threadId = body.threadId ?? crypto.randomUUID();

  await ensureConversation({
    supabase,
    userId: user.id,
    threadId,
    title: body.message
  });

  await supabase.from("messages").insert({
    user_id: user.id,
    conversation_id: threadId,
    role: "user",
    content: body.message,
    metadata: {
      attachmentIds: body.attachmentIds
    }
  });

  const stream = new ReadableStream<Uint8Array>({
    start: async (controller) => {
      try {
        controller.enqueue(sseEvent("meta", { threadId }));

        const result = await runAgentTurn({
          threadId,
          userMessage: body.message,
          attachmentIds: body.attachmentIds,
          context: {
            env: c.env,
            user,
            supabase,
            admin: c.get("admin"),
            checkpointer: new SupabaseThreadCheckpointer(supabase),
            memoryStore: new SupabaseMemoryStore(supabase, user.id)
          }
        });

        for (const toolEvent of result.toolEvents) {
          controller.enqueue(sseEvent("tool_call", toolEvent));
        }

        for (const action of result.pendingActions) {
          controller.enqueue(sseEvent("action_required", action));
        }

        for (const delta of chunkText(result.answer)) {
          controller.enqueue(sseEvent("delta", { delta }));
        }

        const { data: assistantMessage } = await supabase
          .from("messages")
          .insert({
            user_id: user.id,
            conversation_id: threadId,
            role: "assistant",
            content: result.answer,
            metadata: {
              model: result.model,
              toolEvents: result.toolEvents,
              pendingActions: result.pendingActions
            }
          })
          .select("id")
          .single();

        controller.enqueue(
          sseEvent("done", {
            threadId,
            messageId: assistantMessage?.id ?? null,
            model: result.model
          })
        );
      } catch (error) {
        controller.enqueue(
          sseEvent("error", {
            message: error instanceof Error ? error.message : "Unknown chat error."
          })
        );
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache"
    }
  });
});

async function ensureConversation(input: {
  supabase: any;
  userId: string;
  threadId: string;
  title: string;
}): Promise<void> {
  const { data } = await input.supabase
    .from("conversations")
    .select("id")
    .eq("id", input.threadId)
    .eq("user_id", input.userId)
    .maybeSingle();

  if (data) {
    return;
  }

  await input.supabase.from("conversations").insert({
    id: input.threadId,
    user_id: input.userId,
    title: titleFromMessage(input.title)
  });
}

function titleFromMessage(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  return compact.length > 42 ? `${compact.slice(0, 39)}...` : compact || "新的对话";
}
