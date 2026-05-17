export type AgentSseEvent =
  | { type: "meta"; data: { threadId: string } }
  | { type: "delta"; data: { delta: string } }
  | { type: "tool_call"; data: ToolExecutionEvent }
  | { type: "action_required"; data: AgentAction }
  | { type: "action_result"; data: unknown }
  | { type: "done"; data: { threadId: string; messageId: string | null; model?: string } }
  | { type: "error"; data: { message: string } };

export type ToolExecutionEvent = {
  call: {
    id: string;
    name: string;
    risk: "low" | "medium" | "high";
    input: Record<string, unknown>;
  };
  status: "completed" | "requires_confirmation" | "failed";
  result?: unknown;
  error?: string;
};

export type AgentAction = {
  id: string;
  tool_name: string;
  input: Record<string, unknown>;
  risk: "low" | "medium" | "high";
  status: "pending" | "approved" | "rejected" | "failed";
  summary: string;
  created_at: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
  toolEvents?: ToolExecutionEvent[];
  pendingActions?: AgentAction[];
  metadata?: Record<string, unknown>;
};
