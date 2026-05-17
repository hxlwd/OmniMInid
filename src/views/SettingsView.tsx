import React, { useState } from 'react';
import { Topbar } from '../components/Topbar';
import { hasApiToken } from '../api/client';
import { signInWithPassword, signOut } from '../api/supabase';
import { Bot, ChevronDown, Database, KeyRound, Lock, Save, ShieldCheck, SlidersHorizontal } from 'lucide-react';

export default function SettingsView() {
  const [email, setEmail] = useState('3245752780@qq.com');
  const [password, setPassword] = useState('');
  const [authStatus, setAuthStatus] = useState(hasApiToken() ? '已检测到本地 access token' : '尚未登录');
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleLogin(event: React.FormEvent) {
    event.preventDefault();
    setIsSubmitting(true);
    setAuthStatus('正在登录...');

    try {
      await signInWithPassword(email, password);
      setAuthStatus('登录成功，Agent API 已可使用');
      setPassword('');
    } catch (error) {
      setAuthStatus(error instanceof Error ? `登录失败：${error.message}` : '登录失败');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleSignOut() {
    await signOut();
    setAuthStatus('已退出登录');
  }

  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar showSearch={false} />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-16 p-container-padding-mobile md:p-container-padding-desktop">
        <div className="max-w-4xl mx-auto">
          <header className="mb-stack-lg mt-6">
            <h2 className="font-headline-xl-mobile md:font-headline-xl text-on-surface">设置</h2>
            <p className="font-body-lg text-on-surface-variant mt-stack-sm">模型、记忆、权限和后端连接。</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-lg">
            <aside className="md:col-span-4 flex flex-col gap-stack-md">
              <div className="bg-surface-container-lowest rounded-lg p-stack-md shadow-[0_10px_30px_rgba(0,0,0,0.04)] sticky top-[88px] border border-outline-variant">
                <nav className="flex flex-col gap-1">
                  <a href="#agent" className="px-stack-md py-stack-sm rounded-lg bg-surface-container-high text-primary font-label-md font-bold flex items-center gap-2">
                    <Bot className="w-5 h-5" />
                    Agent
                  </a>
                  <a href="#memory" className="px-stack-md py-stack-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md flex items-center gap-2 transition-colors">
                    <Database className="w-5 h-5" />
                    记忆
                  </a>
                  <a href="#permissions" className="px-stack-md py-stack-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md flex items-center gap-2 transition-colors">
                    <ShieldCheck className="w-5 h-5" />
                    权限
                  </a>
                </nav>
              </div>
            </aside>

            <section className="md:col-span-8 flex flex-col gap-stack-lg">
              <SettingsCard id="agent" title="Agent 模型" icon={<Bot className="w-5 h-5 text-primary" />}>
                <Field label="文本模型">
                  <Select value="DeepSeek / OpenAI Compatible" />
                </Field>
                <Field label="Embedding">
                  <Select value="OpenAI text-embedding-3-small" />
                </Field>
                <div className="rounded-lg bg-surface p-stack-md border border-outline-variant">
                  <div className="flex items-center gap-2 mb-2">
                    <SlidersHorizontal className="w-4 h-4 text-primary" />
                    <p className="font-label-md text-on-surface">苏格拉底式导师人格</p>
                  </div>
                  <p className="font-body-md text-on-surface-variant text-sm">默认先诊断卡点，再用问题、提示和小练习引导。</p>
                </div>
              </SettingsCard>

              <SettingsCard id="memory" title="双层记忆" icon={<Database className="w-5 h-5 text-primary" />}>
                <Toggle label="短期线程 Checkpoint" checked />
                <Toggle label="长期 Store 召回" checked />
                <Toggle label="后台记忆压缩队列" checked />
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-stack-md">
                  <MemoryBox label="短期" value="LangGraph thread state" />
                  <MemoryBox label="长期" value="profile / weaknesses / assets" />
                </div>
              </SettingsCard>

              <SettingsCard id="permissions" title="分级权限" icon={<Lock className="w-5 h-5 text-primary" />}>
                <Toggle label="创建、检索、生成自动执行" checked />
                <Toggle label="删除和批量修改前确认" checked />
                <Toggle label="导出分享前确认" checked />
                <form onSubmit={handleLogin} className="rounded-lg bg-surface p-stack-md border border-outline-variant space-y-stack-md">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-primary" />
                    <p className="font-label-md text-on-surface">Supabase 测试登录</p>
                  </div>
                  <Field label="邮箱">
                    <input
                      type="email"
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </Field>
                  <Field label="密码">
                    <input
                      type="password"
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="只在本机输入，不要发给我"
                      className="w-full px-4 py-3 bg-surface-container-low rounded-lg font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:outline-none"
                    />
                  </Field>
                  <p className="font-label-sm text-on-surface-variant">{authStatus}</p>
                  <div className="flex flex-wrap gap-2 justify-end">
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="bg-surface-container-high text-on-surface font-label-md px-5 py-2 rounded-lg hover:bg-surface-variant transition-colors"
                    >
                      退出
                    </button>
                    <button
                      disabled={isSubmitting || !email || !password}
                      className="bg-primary text-on-primary font-label-md px-5 py-2 rounded-lg hover:opacity-90 disabled:opacity-40 transition-opacity flex items-center gap-2"
                    >
                      <Save className="w-4 h-4" />
                      登录并保存 token
                    </button>
                  </div>
                </form>
                <div className="flex justify-end">
                  <button className="hidden bg-primary text-on-primary font-label-md px-5 py-2 rounded-lg hover:opacity-90 transition-opacity items-center gap-2">
                    <Save className="w-4 h-4" />
                    保存
                  </button>
                </div>
              </SettingsCard>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function SettingsCard({ id, title, icon, children }: { id: string; title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <section id={id} className="bg-surface-container-lowest rounded-lg p-stack-lg shadow-[0_10px_30px_rgba(0,0,0,0.04)] border border-outline-variant">
      <h3 className="font-headline-md text-on-surface mb-stack-md flex items-center gap-2 border-b border-surface-variant pb-stack-sm">
        {icon}
        {title}
      </h3>
      <div className="space-y-stack-md">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block font-label-md text-on-surface-variant mb-stack-sm">{label}</span>
      {children}
    </label>
  );
}

function Select({ value }: { value: string }) {
  return (
    <div className="relative">
      <select defaultValue={value} className="w-full appearance-none bg-surface-container-low border-none rounded-lg px-stack-md py-stack-sm pr-10 font-body-md text-on-surface focus:ring-2 focus:ring-primary outline-none">
        <option>{value}</option>
      </select>
      <ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-on-surface-variant" />
    </div>
  );
}

function Toggle({ label, checked }: { label: string; checked?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <p className="font-label-md text-on-surface">{label}</p>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" defaultChecked={checked} className="sr-only peer" />
        <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
      </label>
    </div>
  );
}

function MemoryBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface p-stack-md border border-outline-variant">
      <p className="font-label-sm text-on-surface-variant mb-1">{label}</p>
      <p className="font-label-md text-on-surface">{value}</p>
    </div>
  );
}
