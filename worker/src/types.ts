import type { SupabaseClient } from "@supabase/supabase-js";

export type IngestQueueMessage = {
  assetId: string;
  userId: string;
  reason: "upload" | "retry";
};

export type Env = {
  SUPABASE_URL: string;
  SUPABASE_ANON_KEY: string;
  SUPABASE_SERVICE_ROLE_KEY: string;
  SUPABASE_STORAGE_BUCKET?: string;
  DEEPSEEK_API_KEY?: string;
  DEEPSEEK_BASE_URL?: string;
  DEEPSEEK_MODEL?: string;
  DEEPSEEK_THINKING?: "enabled" | "disabled";
  DEEPSEEK_REASONING_EFFORT?: "low" | "medium" | "high";
  OPENAI_API_KEY?: string;
  OPENAI_EMBEDDING_MODEL?: string;
  INGEST_QUEUE?: Queue<IngestQueueMessage>;
};

export type AuthenticatedUser = {
  id: string;
  email: string | null;
};

export type AppVariables = {
  bearerToken: string;
  user: AuthenticatedUser;
  supabase: SupabaseClient;
  admin: SupabaseClient;
};

export type AppContext = {
  Bindings: Env;
  Variables: AppVariables;
};

export type ChatRole = "system" | "user" | "assistant" | "tool";

export type OmniMessage = {
  role: ChatRole;
  content: string;
  createdAt: string;
  metadata?: Record<string, unknown>;
};

export type ThreadMemoryState = {
  threadId: string;
  messages: OmniMessage[];
  attachmentIds: string[];
  toolResults: ToolExecutionEvent[];
  pendingActionIds: string[];
  updatedAt: string;
};

export type StoredMemory = {
  key: string;
  namespace: string[];
  value: Record<string, unknown>;
  content: string;
  kind: string;
  createdAt: string;
  updatedAt: string;
};

export type ToolRisk = "low" | "medium" | "high";

export type ToolCall = {
  id: string;
  name: string;
  input: Record<string, unknown>;
  risk: ToolRisk;
};

export type ToolExecutionEvent = {
  call: ToolCall;
  status: "completed" | "requires_confirmation" | "failed";
  result?: unknown;
  error?: string;
};

export type AgentTurnResult = {
  threadId: string;
  answer: string;
  model: string;
  toolEvents: ToolExecutionEvent[];
  pendingActions: Array<Record<string, unknown>>;
  memories: StoredMemory[];
};
