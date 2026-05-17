import type { AgentAction, ChatMessage, ToolExecutionEvent } from "../api/types";

export const demoMessages: ChatMessage[] = [
  {
    id: "m1",
    role: "assistant",
    content:
      "欢迎回来。我已经记住了你最近在函数极限和化学反应机理上有些不稳。你可以直接让我创建笔记本、上传资料、诊断薄弱点，或生成一组练习。",
    createdAt: new Date().toISOString()
  },
  {
    id: "m2",
    role: "user",
    content: "帮我看一看最近哪里比较薄弱，再设计几道题强化一下。",
    createdAt: new Date().toISOString()
  },
  {
    id: "m3",
    role: "assistant",
    content:
      "我先召回了长期记忆：你在“从题干判断方法”这一步容易跳步。我们先做三题，每题只训练一个动作：识别条件、选择方法、复盘错因。",
    createdAt: new Date().toISOString(),
    toolEvents: [
      {
        call: {
          id: "t1",
          name: "search_memory",
          risk: "low",
          input: { query: "最近薄弱点" }
        },
        status: "completed"
      },
      {
        call: {
          id: "t2",
          name: "generate_practice",
          risk: "low",
          input: { topic: "函数极限方法判断" }
        },
        status: "completed"
      }
    ]
  }
];

export const demoPendingAction: AgentAction = {
  id: "demo-action",
  tool_name: "delete_asset",
  input: { assetId: "demo-asset" },
  risk: "high",
  status: "pending",
  summary: "归档旧版高数错题 PDF",
  created_at: new Date().toISOString()
};

export const knowledgeItems = [
  { title: "高数错题本", type: "手写笔记", status: "已入库", updated: "今天 19:20", chunks: 42 },
  { title: "有机化学反应机理", type: "图片", status: "OCR 队列", updated: "今天 18:05", chunks: 18 },
  { title: "英语听力精讲", type: "音频", status: "等待转写", updated: "昨天", chunks: 0 },
  { title: "机器学习期末提纲", type: "PDF", status: "已入库", updated: "周五", chunks: 64 }
];

export const weaknessItems = [
  { label: "题干到方法的第一步判断", score: 34, trend: "需要强化" },
  { label: "函数极限中的等价替换边界", score: 48, trend: "本周改善" },
  { label: "有机反应机理箭头方向", score: 41, trend: "反复出错" }
];

export const toolNameMap: Record<string, string> = {
  create_notebook: "创建笔记本",
  search_memory: "检索记忆",
  generate_practice: "生成练习",
  create_study_plan: "创建计划",
  delete_asset: "删除资料"
};

export function createLocalToolEvent(name: string, input: Record<string, unknown>): ToolExecutionEvent {
  return {
    call: {
      id: crypto.randomUUID(),
      name,
      risk: name === "delete_asset" ? "high" : "low",
      input
    },
    status: name === "delete_asset" ? "requires_confirmation" : "completed"
  };
}
