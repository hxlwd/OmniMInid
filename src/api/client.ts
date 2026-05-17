import type { AgentAction, AgentSseEvent } from "./types";

const API_BASE = import.meta.env.VITE_OMNIMIND_API_BASE_URL ?? "http://localhost:8787";

export function hasApiToken(): boolean {
  return Boolean(getAccessToken());
}

export async function streamAgentMessage(input: {
  threadId?: string;
  message: string;
  attachmentIds?: string[];
  onEvent: (event: AgentSseEvent) => void;
}): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("缺少 Supabase access token，当前使用本地演示回复。");
  }

  const response = await fetch(`${API_BASE}/v1/chat`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      threadId: input.threadId,
      message: input.message,
      attachmentIds: input.attachmentIds ?? []
    })
  });

  if (!response.ok || !response.body) {
    throw new Error(`Agent API 请求失败：${response.status}`);
  }

  await readSse(response.body, input.onEvent);
}

export async function approveAction(action: AgentAction): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("缺少 Supabase access token。");
  }

  await fetch(`${API_BASE}/v1/actions/${action.id}/approve`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

export async function rejectAction(action: AgentAction): Promise<void> {
  const token = getAccessToken();
  if (!token) {
    throw new Error("缺少 Supabase access token。");
  }

  await fetch(`${API_BASE}/v1/actions/${action.id}/reject`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`
    }
  });
}

function getAccessToken(): string | null {
  return (
    localStorage.getItem("omnimind.access_token") ||
    import.meta.env.VITE_SUPABASE_ACCESS_TOKEN ||
    null
  );
}

async function readSse(body: ReadableStream<Uint8Array>, onEvent: (event: AgentSseEvent) => void): Promise<void> {
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const parts = buffer.split("\n\n");
    buffer = parts.pop() ?? "";

    for (const part of parts) {
      const parsed = parseSse(part);
      if (parsed) {
        onEvent(parsed);
      }
    }
  }
}

function parseSse(raw: string): AgentSseEvent | null {
  const eventLine = raw.split("\n").find((line) => line.startsWith("event:"));
  const dataLine = raw.split("\n").find((line) => line.startsWith("data:"));
  if (!eventLine || !dataLine) {
    return null;
  }

  return {
    type: eventLine.replace("event:", "").trim() as AgentSseEvent["type"],
    data: JSON.parse(dataLine.replace("data:", "").trim())
  } as AgentSseEvent;
}
