import type { SupabaseClient } from "@supabase/supabase-js";
import { userNamespace, type SupabaseMemoryStore } from "../memory/supabase-store";
import type { AuthenticatedUser, Env, ToolCall, ToolExecutionEvent, ToolRisk } from "../types";

export type ToolContext = {
  env: Env;
  user: AuthenticatedUser;
  supabase: SupabaseClient;
  admin: SupabaseClient;
  memoryStore: SupabaseMemoryStore;
};

export type AgentTool = {
  name: string;
  risk: ToolRisk;
  description: string;
  execute: (input: Record<string, unknown>, context: ToolContext) => Promise<unknown>;
};

export const agentTools: AgentTool[] = [
  {
    name: "create_notebook",
    risk: "low",
    description: "创建学习笔记本或知识库文件夹。",
    execute: async (input, context) => {
      const title = stringValue(input.title, "未命名笔记本");
      const { data, error } = await context.supabase
        .from("notebooks")
        .insert({
          user_id: context.user.id,
          title,
          description: stringValue(input.description, "由 OmniMind Agent 创建"),
          source: "agent"
        })
        .select("id, title, description, created_at")
        .single();

      if (error) {
        throw new Error(error.message);
      }

      await context.memoryStore.put({
        namespace: userNamespace(context.user.id, "agent_actions"),
        key: crypto.randomUUID(),
        kind: "agent_action",
        value: { tool: "create_notebook", title, notebookId: data.id },
        content: `Agent 创建了笔记本「${title}」。`
      });

      return data;
    }
  },
  {
    name: "search_memory",
    risk: "low",
    description: "检索长期学习记忆和薄弱点。",
    execute: async (input, context) => {
      const query = stringValue(input.query, "");
      const memories = await context.memoryStore.search({
        namespacePrefix: [`user:${context.user.id}`],
        query,
        limit: 8
      });
      return { memories };
    }
  },
  {
    name: "generate_practice",
    risk: "low",
    description: "基于薄弱点生成练习题。",
    execute: async (input, context) => {
      const topic = stringValue(input.topic, "当前薄弱点");
      const items = buildPracticeItems(topic);
      const { data: set, error: setError } = await context.supabase
        .from("practice_sets")
        .insert({
          user_id: context.user.id,
          title: `${topic} 强化练习`,
          topic,
          source: "agent",
          status: "draft"
        })
        .select("id, title, topic, status, created_at")
        .single();

      if (setError) {
        throw new Error(setError.message);
      }

      const { data: practiceItems, error: itemError } = await context.supabase
        .from("practice_items")
        .insert(
          items.map((item, index) => ({
            user_id: context.user.id,
            practice_set_id: set.id,
            position: index + 1,
            ...item
          }))
        )
        .select("id, position, prompt, answer, explanation, difficulty");

      if (itemError) {
        throw new Error(itemError.message);
      }

      return { set, items: practiceItems ?? [] };
    }
  },
  {
    name: "create_study_plan",
    risk: "medium",
    description: "创建学习计划和任务。",
    execute: async (input, context) => {
      const title = stringValue(input.title, "OmniMind 学习计划");
      const objective = stringValue(input.objective, title);
      const { data: plan, error: planError } = await context.supabase
        .from("study_plans")
        .insert({
          user_id: context.user.id,
          title,
          objective,
          status: "active"
        })
        .select("id, title, objective, status, created_at")
        .single();

      if (planError) {
        throw new Error(planError.message);
      }

      const tasks = ["诊断当前基础", "整理资料与笔记", "完成第一组主动回忆", "针对错因生成练习", "复盘并更新薄弱点"].map(
        (taskTitle, index) => ({
          user_id: context.user.id,
          study_plan_id: plan.id,
          position: index + 1,
          title: taskTitle,
          status: "pending",
          estimated_minutes: index === 0 ? 20 : 40
        })
      );

      const { data: createdTasks, error: taskError } = await context.supabase
        .from("study_tasks")
        .insert(tasks)
        .select("id, position, title, status, estimated_minutes");

      if (taskError) {
        throw new Error(taskError.message);
      }

      return { plan, tasks: createdTasks ?? [] };
    }
  },
  {
    name: "delete_asset",
    risk: "high",
    description: "删除或归档学习资料，需要用户确认。",
    execute: async (input, context) => {
      const assetId = stringValue(input.assetId, "");
      const { data, error } = await context.supabase
        .from("learning_assets")
        .update({ status: "archived" })
        .eq("id", assetId)
        .eq("user_id", context.user.id)
        .select("id, title, status")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      return data;
    }
  }
];

export function inferToolCalls(message: string): ToolCall[] {
  const calls: ToolCall[] = [];
  const normalized = message.trim();

  if (/(创建|新建|建立).*(笔记本|知识库|文件夹|notebook)/i.test(normalized)) {
    calls.push(makeCall("create_notebook", "low", {
      title: extractNotebookTitle(normalized),
      description: "由自然语言指令创建"
    }));
  }

  if (/(薄弱|弱点|不熟|不会|错题|诊断|weak)/i.test(normalized)) {
    calls.push(makeCall("search_memory", "low", { query: normalized }));
  }

  if (/(题|练习|quiz|强化|测试)/i.test(normalized)) {
    calls.push(makeCall("generate_practice", "low", { topic: extractTopic(normalized) }));
  }

  if (/(学习计划|复习计划|study plan|规划)/i.test(normalized)) {
    calls.push(
      makeCall("create_study_plan", "medium", {
        title: extractTopic(normalized),
        objective: normalized
      })
    );
  }

  if (/(删除|清空|移除|delete)/i.test(normalized)) {
    calls.push(makeCall("delete_asset", "high", { assetId: "" }));
  }

  return calls;
}

export async function executeToolCalls(
  calls: ToolCall[],
  context: ToolContext
): Promise<{ events: ToolExecutionEvent[]; pendingActions: Array<Record<string, unknown>> }> {
  const events: ToolExecutionEvent[] = [];
  const pendingActions: Array<Record<string, unknown>> = [];

  for (const call of calls) {
    const tool = agentTools.find((candidate) => candidate.name === call.name);
    if (!tool) {
      events.push({ call, status: "failed", error: "Tool was not registered." });
      continue;
    }

    if (tool.risk === "high") {
      const pendingAction = await createPendingAction(call, context);
      pendingActions.push(pendingAction);
      events.push({ call, status: "requires_confirmation", result: pendingAction });
      continue;
    }

    try {
      const result = await tool.execute(call.input, context);
      events.push({ call, status: "completed", result });
    } catch (error) {
      events.push({ call, status: "failed", error: error instanceof Error ? error.message : String(error) });
    }
  }

  return { events, pendingActions };
}

export async function executeApprovedAction(action: any, context: ToolContext): Promise<unknown> {
  const tool = agentTools.find((candidate) => candidate.name === action.tool_name);
  if (!tool) {
    throw new Error("Tool was not registered.");
  }

  return tool.execute(action.input ?? {}, context);
}

async function createPendingAction(call: ToolCall, context: ToolContext): Promise<Record<string, unknown>> {
  const { data, error } = await context.supabase
    .from("agent_actions")
    .insert({
      user_id: context.user.id,
      tool_name: call.name,
      input: call.input,
      risk: call.risk,
      status: "pending",
      summary: summarizeCall(call)
    })
    .select("id, tool_name, input, risk, status, summary, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

function makeCall(name: string, risk: ToolRisk, input: Record<string, unknown>): ToolCall {
  return {
    id: crypto.randomUUID(),
    name,
    risk,
    input
  };
}

function stringValue(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function extractNotebookTitle(message: string): string {
  const match = /(创建|新建|建立)(一个|一份)?(?<title>.*?)(笔记本|知识库|文件夹|notebook)/i.exec(message);
  const title = match?.groups?.title?.replace(/[，。,.]/g, "").trim();
  return title || "新的学习笔记本";
}

function extractTopic(message: string): string {
  const cleaned = message.replace(/(帮我|请|生成|设计|几道|一些|练习|题目|强化|学习计划|复习计划)/g, "").trim();
  return cleaned.slice(0, 40) || "当前学习主题";
}

function buildPracticeItems(topic: string) {
  return [
    {
      prompt: `用一句话解释「${topic}」中你最容易混淆的概念，并举一个反例。`,
      answer: "答案应包含核心定义、易混点和反例。",
      explanation: "这道题用于检查概念边界，而不是背诵定义。",
      difficulty: "warmup"
    },
    {
      prompt: `给出一个关于「${topic}」的典型题，先写出第一步判断依据。`,
      answer: "先识别题目条件和目标，再选择对应方法。",
      explanation: "OmniMind 会优先训练从题干到方法的连接。",
      difficulty: "core"
    },
    {
      prompt: `总结你在「${topic}」上可能犯错的原因，并写下下一次的检查清单。`,
      answer: "检查清单应可执行，例如先标注已知量、再验证单位或前提。",
      explanation: "把错因转成动作，是长期记忆更新的关键。",
      difficulty: "reflection"
    }
  ];
}

function summarizeCall(call: ToolCall): string {
  if (call.name === "delete_asset") {
    return "归档或删除学习资料";
  }
  return `执行 ${call.name}`;
}
