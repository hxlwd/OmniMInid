import React, { useMemo, useState } from 'react';
import { Topbar } from '../components/Topbar';
import { USER_IMAGE } from '../constants';
import { approveAction, hasApiToken, rejectAction, streamAgentMessage } from '../api/client';
import type { AgentAction, ChatMessage, ToolExecutionEvent } from '../api/types';
import { createLocalToolEvent, demoMessages, demoPendingAction, toolNameMap, weaknessItems } from '../data/demo';
import {
  Bot,
  Brain,
  Check,
  Clock3,
  FileUp,
  Lock,
  Paperclip,
  Send,
  Sparkles,
  Target,
  X
} from 'lucide-react';

export default function DashboardView() {
  const [threadId, setThreadId] = useState<string | undefined>();
  const [messages, setMessages] = useState<ChatMessage[]>(() =>
    hasApiToken()
      ? [
          {
            id: 'connected-welcome',
            role: 'assistant',
            content: '我已经连接到真实后端。现在发来的消息会经过 Worker、Supabase 记忆系统和 DeepSeek V4 Pro。',
            createdAt: new Date().toISOString()
          }
        ]
      : demoMessages
  );
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [pendingActions, setPendingActions] = useState<AgentAction[]>(() => (hasApiToken() ? [] : [demoPendingAction]));
  const connected = hasApiToken();

  const latestToolEvents = useMemo(() => {
    return messages.flatMap((message) => message.toolEvents ?? []).slice(-5);
  }, [messages]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || isStreaming) return;

    setInput('');
    setIsStreaming(true);

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: 'user',
      content: message,
      createdAt: new Date().toISOString()
    };
    const assistantId = crypto.randomUUID();
    const assistantMessage: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      createdAt: new Date().toISOString(),
      toolEvents: []
    };

    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      if (!connected) {
        const local = buildLocalAgentTurn(message);
        setMessages((current) =>
          current.map((item) =>
            item.id === assistantId
              ? {
                  ...item,
                  content: local.answer,
                  toolEvents: local.toolEvents
                }
              : item
          )
        );
        setPendingActions((current) => [...local.pendingActions, ...current]);
        return;
      }

      await streamAgentMessage({
        threadId,
        message,
        onEvent: (sse) => {
          if (sse.type === 'meta') {
            setThreadId(sse.data.threadId);
          }
          if (sse.type === 'delta') {
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: `${item.content}${sse.data.delta}` } : item
              )
            );
          }
          if (sse.type === 'tool_call') {
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, toolEvents: [...(item.toolEvents ?? []), sse.data] } : item
              )
            );
          }
          if (sse.type === 'action_required') {
            setPendingActions((current) => [sse.data, ...current]);
          }
          if (sse.type === 'done') {
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, metadata: { ...(item.metadata ?? {}), model: sse.data.model } } : item
              )
            );
          }
          if (sse.type === 'error') {
            setMessages((current) =>
              current.map((item) =>
                item.id === assistantId ? { ...item, content: `后端返回错误：${sse.data.message}` } : item
              )
            );
          }
        }
      });
    } catch (error) {
      setMessages((current) =>
        current.map((item) =>
          item.id === assistantId
            ? {
                ...item,
                content:
                  error instanceof Error
                    ? `后端暂时不可用：${error.message}\n\n我已切换为本地演示模式。你可以继续预览 Agent 工作台的交互。`
                    : '后端暂时不可用。'
              }
            : item
        )
      );
    } finally {
      setIsStreaming(false);
    }
  }

  async function handleAction(action: AgentAction, approved: boolean) {
    if (connected) {
      try {
        if (approved) {
          await approveAction(action);
        } else {
          await rejectAction(action);
        }
      } catch {
        // Keep UI responsive in preview mode.
      }
    }

    setPendingActions((current) => current.filter((item) => item.id !== action.id));
  }

  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <Topbar showSearch={false} />

      <main className="md:ml-[var(--sidebar-width,280px)] w-full pt-16 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 flex flex-row overflow-hidden p-container-padding-mobile md:p-container-padding-desktop gap-gutter mx-auto w-full max-w-7xl">
          <section className="flex-1 flex flex-col bg-surface-container-lowest rounded-lg soft-shadow overflow-hidden border border-outline-variant">
            <div className="px-stack-lg py-stack-md border-b border-outline-variant bg-surface flex items-center justify-between gap-stack-md">
              <div className="min-w-0">
                <h2 className="font-headline-md text-on-surface">Agent 中枢</h2>
                <p className="font-label-sm text-on-surface-variant truncate">
                  {connected ? '已连接 Cloudflare Workers 后端' : '本地演示模式，填入 Supabase token 后自动连接'}
                </p>
              </div>
              <div className="flex items-center gap-2 text-on-surface-variant font-label-sm">
                <Lock className="w-4 h-4 text-primary" />
                高风险操作需确认
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-stack-lg flex flex-col gap-stack-lg">
              {messages.map((message) => (
                <MessageBubble key={message.id} message={message} />
              ))}
            </div>

            <form onSubmit={handleSubmit} className="p-stack-md bg-surface border-t border-outline-variant">
              <div className="relative flex items-center bg-[#F5F7FA] rounded-lg border-2 border-transparent focus-within:border-primary transition-colors">
                <label className="p-3 text-on-surface-variant hover:text-primary transition-colors cursor-pointer">
                  <Paperclip className="w-5 h-5" />
                  <input className="hidden" type="file" multiple />
                </label>
                <input
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none font-body-md py-3 px-2 text-on-surface placeholder:text-outline"
                  placeholder="让 OmniMind 创建笔记本、诊断薄弱点、生成练习..."
                />
                <button
                  disabled={!input.trim() || isStreaming}
                  className="p-3 m-1 bg-primary text-on-primary rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center justify-center"
                  type="submit"
                >
                  <Send className="w-5 h-5" />
                </button>
              </div>
            </form>
          </section>

          <aside className="hidden xl:flex flex-col w-[340px] gap-stack-md overflow-y-auto hide-scrollbar">
            <Panel title="当前上下文" icon={<Target className="w-5 h-5 text-primary" />}>
              <div className="space-y-3">
                <Metric label="学习线程" value={threadId ? '已持久化' : '演示线程'} />
                <Metric label="短期记忆" value="最近 30 条消息" />
                <Metric label="长期记忆" value="profile / weaknesses / assets" />
              </div>
            </Panel>

            <Panel title="工具调用" icon={<Sparkles className="w-5 h-5 text-primary" />}>
              <div className="space-y-2">
                {latestToolEvents.length ? (
                  latestToolEvents.map((event) => <ToolRow key={event.call.id} event={event} />)
                ) : (
                  <p className="font-body-md text-on-surface-variant text-sm">等待 Agent 执行工具</p>
                )}
              </div>
            </Panel>

            <Panel title="待确认操作" icon={<Lock className="w-5 h-5 text-primary" />}>
              <div className="space-y-3">
                {pendingActions.map((action) => (
                  <div key={action.id} className="rounded-lg border border-outline-variant p-stack-md bg-surface">
                    <p className="font-label-md text-on-surface mb-1">{action.summary}</p>
                    <p className="font-label-sm text-on-surface-variant mb-3">{toolNameMap[action.tool_name] ?? action.tool_name}</p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleAction(action, true)}
                        className="flex-1 h-9 rounded-lg bg-primary text-on-primary flex items-center justify-center"
                        type="button"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleAction(action, false)}
                        className="flex-1 h-9 rounded-lg bg-surface-container-high text-on-surface flex items-center justify-center"
                        type="button"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </Panel>

            <Panel title="薄弱点雷达" icon={<Brain className="w-5 h-5 text-primary" />}>
              <div className="space-y-3">
                {weaknessItems.map((item) => (
                  <div key={item.label}>
                    <div className="flex justify-between font-label-sm mb-1">
                      <span className="text-on-surface">{item.label}</span>
                      <span className="text-on-surface-variant">{item.score}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                      <div className="h-full bg-primary rounded-full" style={{ width: `${item.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </Panel>
          </aside>
        </div>
      </main>
    </div>
  );
}

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';
  return (
    <div className={`flex gap-stack-md max-w-3xl ${isUser ? 'self-end flex-row-reverse' : ''}`}>
      <div
        className={`w-10 h-10 rounded-full shrink-0 overflow-hidden shadow-sm flex items-center justify-center ${
          isUser ? 'bg-surface-variant' : 'bg-primary text-on-primary'
        }`}
      >
        {isUser ? <img src={USER_IMAGE} alt="User" className="w-full h-full object-cover" /> : <Bot className="w-6 h-6" />}
      </div>
      <div className={`flex flex-col gap-2 ${isUser ? 'items-end' : ''}`}>
        <span className="font-label-sm text-on-surface-variant">{isUser ? '你' : 'OmniMind'}</span>
        {!isUser && typeof message.metadata?.model === 'string' && (
          <span className="w-fit px-2 py-1 rounded-lg bg-primary-fixed text-on-primary-fixed font-label-sm">
            {message.metadata.model === 'deepseek-v4-pro' ? 'DeepSeek V4 Pro' : String(message.metadata.model)}
          </span>
        )}
        <div
          className={`rounded-lg p-4 font-body-md shadow-sm whitespace-pre-wrap ${
            isUser
              ? 'bg-primary text-on-primary'
              : 'bg-surface border border-outline-variant text-on-surface'
          }`}
        >
          {message.content || '正在思考...'}
        </div>
        {!!message.toolEvents?.length && (
          <div className="flex flex-wrap gap-2">
            {message.toolEvents.map((event) => (
              <span key={event.call.id} className="px-2 py-1 rounded-lg bg-surface-container-high font-label-sm text-on-surface-variant">
                {toolNameMap[event.call.name] ?? event.call.name} · {event.status === 'completed' ? '完成' : '待确认'}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Panel({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section className="bg-surface-container-lowest rounded-lg p-stack-lg soft-shadow border border-outline-variant">
      <div className="flex items-center justify-between mb-stack-md">
        <h3 className="font-headline-md text-on-surface">{title}</h3>
        {icon}
      </div>
      {children}
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 font-label-md">
      <span className="text-on-surface-variant">{label}</span>
      <span className="text-on-surface text-right">{value}</span>
    </div>
  );
}

function ToolRow({ event }: { event: ToolExecutionEvent }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg bg-surface p-3 border border-outline-variant">
      <div className="min-w-0">
        <p className="font-label-md text-on-surface truncate">{toolNameMap[event.call.name] ?? event.call.name}</p>
        <p className="font-label-sm text-on-surface-variant">{event.call.risk === 'high' ? '高风险' : '自动执行'}</p>
      </div>
      <Clock3 className="w-4 h-4 text-primary shrink-0" />
    </div>
  );
}

function buildLocalAgentTurn(message: string): {
  answer: string;
  toolEvents: ToolExecutionEvent[];
  pendingActions: AgentAction[];
} {
  const toolEvents: ToolExecutionEvent[] = [];
  const pendingActions: AgentAction[] = [];

  if (/(创建|新建).*(笔记本|知识库)/.test(message)) {
    toolEvents.push(createLocalToolEvent('create_notebook', { title: '新的学习笔记本' }));
  }
  if (/(薄弱|弱点|不会|卡住|诊断)/.test(message)) {
    toolEvents.push(createLocalToolEvent('search_memory', { query: message }));
  }
  if (/(题|练习|强化|quiz)/i.test(message)) {
    toolEvents.push(createLocalToolEvent('generate_practice', { topic: '当前薄弱点' }));
  }
  if (/(删除|清空|移除)/.test(message)) {
    const action = {
      ...demoPendingAction,
      id: crypto.randomUUID(),
      summary: '归档或删除学习资料'
    };
    pendingActions.push(action);
    toolEvents.push(createLocalToolEvent('delete_asset', { assetId: 'preview' }));
  }

  const answer = toolEvents.length
    ? '我已经按低风险权限自动执行了可直接完成的操作；涉及删除或清空的动作会留在右侧等待确认。接下来我们可以继续把结果细化成笔记、练习或学习计划。'
    : '我们先定位问题。你现在最确定的一步是什么？从哪一句条件开始变得不确定？';

  return { answer, toolEvents, pendingActions };
}
