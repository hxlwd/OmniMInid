import type { Env, OmniMessage, StoredMemory, ToolExecutionEvent } from "../types";

type ProviderMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type TutorTurnCompletion = {
  answer: string;
  model: string;
};

export async function completeTutorTurn(input: {
  env: Env;
  userMessage: string;
  shortTermMessages: OmniMessage[];
  memories: StoredMemory[];
  toolEvents: ToolExecutionEvent[];
}): Promise<TutorTurnCompletion> {
  const system = [
    "你是 OmniMind，一个严谨、耐心的苏格拉底式学习 Agent。",
    "你不只是回答问题，还能解释刚刚执行的软件操作。",
    "如果用户在学习问题上卡住，先定位卡点，再用问题和最小提示引导。",
    "引用长期记忆时，只引用输入中明确提供的记忆，不编造历史。",
    "回复使用中文，语气清晰、稳、可执行。"
  ].join("\n");

  const memoryBlock = input.memories.length
    ? input.memories.map((memory, index) => `${index + 1}. [${memory.kind}] ${memory.content}`).join("\n")
    : "本轮没有召回到长期记忆。";
  const toolBlock = input.toolEvents.length
    ? input.toolEvents
        .map((event) => `${event.call.name}: ${event.status}${event.error ? ` (${event.error})` : ""}`)
        .join("\n")
    : "本轮没有执行工具。";

  const messages: ProviderMessage[] = [
    {
      role: "system",
      content: `${system}\n\n长期记忆：\n${memoryBlock}\n\n工具执行：\n${toolBlock}`
    },
    ...input.shortTermMessages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .slice(-10)
      .map((message) => ({ role: message.role as "user" | "assistant", content: message.content })),
    {
      role: "user",
      content: input.userMessage
    }
  ];

  const providerAnswer = await callChatProvider(input.env, messages);
  if (providerAnswer) {
    return providerAnswer;
  }

  return {
    answer: fallbackAnswer(input.userMessage, input.memories, input.toolEvents),
    model: "local-fallback"
  };
}

async function callChatProvider(env: Env, messages: ProviderMessage[]): Promise<TutorTurnCompletion | null> {
  if (env.DEEPSEEK_API_KEY) {
    const model = env.DEEPSEEK_MODEL ?? "deepseek-v4-pro";
    const answer = await callOpenAICompatible({
      apiKey: env.DEEPSEEK_API_KEY,
      baseUrl: env.DEEPSEEK_BASE_URL ?? "https://api.deepseek.com",
      model,
      messages,
      thinking: env.DEEPSEEK_THINKING ?? "enabled",
      reasoningEffort: env.DEEPSEEK_REASONING_EFFORT ?? "high"
    });
    return { answer, model };
  }

  if (env.OPENAI_API_KEY) {
    const model = "gpt-4.1-mini";
    const answer = await callOpenAICompatible({
      apiKey: env.OPENAI_API_KEY,
      baseUrl: "https://api.openai.com/v1",
      model,
      messages,
      thinking: "disabled",
      reasoningEffort: "medium"
    });
    return { answer, model };
  }

  return null;
}

async function callOpenAICompatible(input: {
  apiKey: string;
  baseUrl: string;
  model: string;
  messages: ProviderMessage[];
  thinking: "enabled" | "disabled";
  reasoningEffort: "low" | "medium" | "high";
}): Promise<string | null> {
  const response = await fetch(`${input.baseUrl.replace(/\/$/, "")}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.apiKey}`,
      "Content-Type": "application/json; charset=utf-8"
    },
    body: JSON.stringify({
      model: input.model,
      messages: input.messages,
      temperature: 0.35,
      thinking: {
        type: input.thinking
      },
      reasoning_effort: input.reasoningEffort,
      stream: false
    })
  });

  const raw = await response.text();

  if (!response.ok) {
    throw new Error(`DeepSeek API error ${response.status}: ${sanitizeProviderError(raw)}`);
  }

  let json: any;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new Error(`DeepSeek API returned non-JSON response: ${raw.slice(0, 240)}`);
  }

  const message = json.choices?.[0]?.message;
  const content = typeof message?.content === "string" ? message.content.trim() : "";
  if (content) {
    return content;
  }

  const finishReason = json.choices?.[0]?.finish_reason ?? "unknown";
  throw new Error(`DeepSeek API returned an empty answer. finish_reason=${finishReason}`);
}

function sanitizeProviderError(raw: string): string {
  return raw.replace(/sk-[A-Za-z0-9_-]+/g, "sk-***").slice(0, 500);
}

function fallbackAnswer(message: string, memories: StoredMemory[], toolEvents: ToolExecutionEvent[]): string {
  const completed = toolEvents.filter((event) => event.status === "completed");
  const pending = toolEvents.filter((event) => event.status === "requires_confirmation");

  if (completed.length || pending.length) {
    const doneText = completed.length ? `我已经完成了 ${completed.length} 个操作。` : "";
    const pendingText = pending.length ? `还有 ${pending.length} 个高风险操作需要你确认后再执行。` : "";
    return `${doneText}${pendingText} 接下来我们可以围绕刚刚生成的内容继续细化：你想先看结构，还是直接进入练习？`;
  }

  if (/薄弱|不会|卡住|错题|weak/i.test(message)) {
    const memoryHint = memories[0]?.content ? `我先参考到一条长期记忆：${memories[0].content}` : "我还没有足够的长期诊断。";
    return `${memoryHint}\n\n我们先用一个小问题定位卡点：你觉得自己更不确定的是“概念是什么意思”，还是“看到题目不知道从哪一步开始”？`;
  }

  return "我会一步一步带你拆。先告诉我：你现在最确定的一点是什么？哪一步开始变得模糊？";
}

export async function embedText(env: Env, text: string): Promise<number[] | null> {
  if (!env.OPENAI_API_KEY || !text.trim()) {
    return null;
  }

  try {
    const response = await fetch("https://api.openai.com/v1/embeddings", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: env.OPENAI_EMBEDDING_MODEL ?? "text-embedding-3-small",
        input: text
      })
    });

    if (!response.ok) {
      return null;
    }

    const json: any = await response.json();
    return json.data?.[0]?.embedding ?? null;
  } catch {
    return null;
  }
}
