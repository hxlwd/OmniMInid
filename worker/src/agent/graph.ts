import { Annotation, END, START, StateGraph } from "@langchain/langgraph";
import { completeTutorTurn } from "./model";
import { executeToolCalls, inferToolCalls, type ToolContext } from "./tools";
import type { SupabaseThreadCheckpointer } from "../memory/supabase-checkpointer";
import type { SupabaseMemoryStore } from "../memory/supabase-store";
import type { AgentTurnResult, OmniMessage, StoredMemory, ThreadMemoryState, ToolExecutionEvent } from "../types";

const AgentState = Annotation.Root({
  threadId: Annotation<string>(),
  userId: Annotation<string>(),
  userMessage: Annotation<string>(),
  attachmentIds: Annotation<string[]>({
    reducer: (_left, right) => right,
    default: () => []
  }),
  shortTerm: Annotation<ThreadMemoryState | null>({
    reducer: (_left, right) => right,
    default: () => null
  }),
  memories: Annotation<StoredMemory[]>({
    reducer: (_left, right) => right,
    default: () => []
  }),
  toolEvents: Annotation<ToolExecutionEvent[]>({
    reducer: (left, right) => left.concat(right),
    default: () => []
  }),
  pendingActions: Annotation<Array<Record<string, unknown>>>({
    reducer: (left, right) => left.concat(right),
    default: () => []
  }),
  answer: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => ""
  }),
  model: Annotation<string>({
    reducer: (_left, right) => right,
    default: () => "unknown"
  })
});

type AgentGraphContext = ToolContext & {
  checkpointer: SupabaseThreadCheckpointer;
  memoryStore: SupabaseMemoryStore;
};

export async function runAgentTurn(input: {
  threadId: string;
  userMessage: string;
  attachmentIds: string[];
  context: AgentGraphContext;
}): Promise<AgentTurnResult> {
  const graph = buildGraph(input.context);
  const result: any = await graph.invoke({
    threadId: input.threadId,
    userId: input.context.user.id,
    userMessage: input.userMessage,
    attachmentIds: input.attachmentIds
  });

  return {
    threadId: input.threadId,
    answer: result.answer,
    model: result.model,
    toolEvents: result.toolEvents ?? [],
    pendingActions: result.pendingActions ?? [],
    memories: result.memories ?? []
  };
}

function buildGraph(context: AgentGraphContext) {
  const workflow = new StateGraph(AgentState)
    .addNode("load_memory", async (state: any) => {
      const shortTerm = await context.checkpointer.getLatest(state.userId, state.threadId);
      const memories = await context.memoryStore.search({
        namespacePrefix: [`user:${state.userId}`],
        query: state.userMessage,
        limit: 8
      });

      return {
        shortTerm,
        memories
      };
    })
    .addNode("act", async (state: any) => {
      const calls = inferToolCalls(state.userMessage);
      const { events, pendingActions } = await executeToolCalls(calls, context);
      return {
        toolEvents: events,
        pendingActions
      };
    })
    .addNode("respond", async (state: any) => {
      const completion = await completeTutorTurn({
        env: context.env,
        userMessage: state.userMessage,
        shortTermMessages: state.shortTerm?.messages ?? [],
        memories: state.memories ?? [],
        toolEvents: state.toolEvents ?? []
      });

      return {
        answer: completion.answer,
        model: completion.model
      };
    })
    .addNode("persist", async (state: any) => {
      const now = new Date().toISOString();
      const previous = state.shortTerm as ThreadMemoryState;
      const nextMessages: OmniMessage[] = [
        ...(previous?.messages ?? []),
        {
          role: "user",
          content: state.userMessage,
          createdAt: now,
          metadata: {
            attachmentIds: state.attachmentIds
          }
        },
        {
          role: "assistant",
          content: state.answer,
          createdAt: now,
          metadata: {
            toolEventCount: state.toolEvents?.length ?? 0,
            model: state.model
          }
        }
      ];

      await context.checkpointer.put({
        userId: state.userId,
        threadId: state.threadId,
        source: "chat",
        state: {
          ...previous,
          threadId: state.threadId,
          messages: nextMessages,
          attachmentIds: Array.from(new Set([...(previous?.attachmentIds ?? []), ...(state.attachmentIds ?? [])])),
          toolResults: [...(previous?.toolResults ?? []), ...(state.toolEvents ?? [])],
          pendingActionIds: [
            ...(previous?.pendingActionIds ?? []),
            ...(state.pendingActions ?? []).map((action: any) => String(action.id))
          ],
          updatedAt: now
        }
      });

      if (shouldRememberWeakness(state.userMessage, state.answer)) {
        await context.memoryStore.put({
          namespace: [`user:${state.userId}`, "weaknesses"],
          key: crypto.randomUUID(),
          kind: "weakness",
          value: {
            source: "chat",
            threadId: state.threadId,
            userMessage: state.userMessage
          },
          content: summarizeWeakness(state.userMessage, state.answer)
        });
      }

      return {};
    });

  return workflow
    .addEdge(START, "load_memory")
    .addEdge("load_memory", "act")
    .addEdge("act", "respond")
    .addEdge("respond", "persist")
    .addEdge("persist", END)
    .compile();
}

function shouldRememberWeakness(userMessage: string, answer: string): boolean {
  return /(不会|不懂|薄弱|错|卡住|模糊|weak)/i.test(`${userMessage}\n${answer}`);
}

function summarizeWeakness(userMessage: string, answer: string): string {
  return `用户在这轮学习中暴露出需要继续诊断的点：${userMessage.slice(0, 120)}。Agent 建议：${answer.slice(0, 160)}`;
}
