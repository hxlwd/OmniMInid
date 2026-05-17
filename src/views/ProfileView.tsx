import React from 'react';
import { Topbar } from '../components/Topbar';
import { PROFILE_IMAGE } from '../constants';
import { weaknessItems } from '../data/demo';
import { Activity, ArrowUp, Brain, Database, MemoryStick, ShieldCheck, TrendingUp } from 'lucide-react';

const memoryStats = [
  { label: '短期线程', value: '30 条', icon: MemoryStick },
  { label: '长期记忆', value: '126 条', icon: Database },
  { label: '薄弱点', value: '18 个', icon: Brain },
  { label: '确认操作', value: '2 个', icon: ShieldCheck }
];

export default function ProfileView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="搜索学习画像、记忆和趋势..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-24 px-container-padding-mobile md:px-container-padding-desktop pb-container-padding-desktop">
        <div className="max-w-6xl mx-auto">
          <div className="mb-stack-lg">
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-on-surface mb-stack-sm">学习画像</h1>
            <p className="font-body-lg text-on-surface-variant">长期记忆、薄弱点和 Agent 操作会在这里汇总。</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            <section className="md:col-span-4 bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant flex flex-col items-center text-center">
              <div className="w-28 h-28 rounded-full overflow-hidden mb-stack-md border-4 border-surface-bright shadow-sm">
                <img src={PROFILE_IMAGE} alt="学习者" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-headline-md text-on-surface mb-1">学习者</h2>
              <p className="font-body-md text-primary font-medium mb-stack-md">OmniMind 记忆档案</p>
              <div className="w-full rounded-lg bg-surface p-stack-md border border-outline-variant">
                <p className="font-label-sm text-on-surface-variant mb-2">画像摘要</p>
                <p className="font-body-md text-on-surface text-sm">
                  偏好先看步骤，再做小题验证。遇到复杂题时容易跳过题干条件整理。
                </p>
              </div>
            </section>

            <section className="md:col-span-8 flex flex-col gap-gutter">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                {memoryStats.map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant">
                      <div className="p-3 bg-primary/10 rounded-lg text-primary w-fit mb-stack-md">
                        <Icon className="w-5 h-5" />
                      </div>
                      <h3 className="font-label-md text-on-surface-variant mb-1">{stat.label}</h3>
                      <p className="font-headline-md text-on-surface">{stat.value}</p>
                    </div>
                  );
                })}
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter">
                <section className="bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant">
                  <div className="flex justify-between items-center mb-stack-md">
                    <h3 className="font-headline-md text-on-surface">薄弱点趋势</h3>
                    <TrendingUp className="w-5 h-5 text-primary" />
                  </div>
                  <div className="space-y-4">
                    {weaknessItems.map((item) => (
                      <div key={item.label}>
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-label-md text-on-surface">{item.label}</span>
                          <span className="font-label-sm text-on-surface-variant">{item.trend}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-container-high overflow-hidden">
                          <div className="h-full bg-primary rounded-full" style={{ width: `${item.score}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                <section className="bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant">
                  <div className="flex justify-between items-center mb-stack-md">
                    <h3 className="font-headline-md text-on-surface">本周活动</h3>
                    <Activity className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex items-end justify-between gap-2 h-[220px]">
                    {[
                      { l: '一', h: '40%', v: '2.1h' },
                      { l: '二', h: '65%', v: '3.5h' },
                      { l: '三', h: '90%', v: '4.8h', active: true },
                      { l: '四', h: '30%', v: '1.5h' },
                      { l: '五', h: '75%', v: '4.0h' },
                      { l: '六', h: '20%', v: '1.0h' },
                      { l: '日', h: '10%', v: '0.5h' }
                    ].map((bar) => (
                      <div key={bar.l} className="w-full flex flex-col items-center gap-2">
                        <div
                          className={`w-full ${bar.active ? 'bg-primary' : 'bg-surface-container-high'} rounded-t-sm group relative`}
                          style={{ height: bar.h }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded font-label-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {bar.v}
                          </div>
                        </div>
                        <span className={`font-label-sm ${bar.active ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>
                          {bar.l}
                        </span>
                      </div>
                    ))}
                  </div>
                </section>
              </div>

              <section className="bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant">
                <div className="flex items-center gap-2 mb-stack-md">
                  <ArrowUp className="w-5 h-5 text-[#2E7D32]" />
                  <h3 className="font-headline-md text-on-surface">记忆更新日志</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md">
                  <LogItem label="新弱点" value="函数极限方法判断" />
                  <LogItem label="新资料" value="机器学习期末提纲" />
                  <LogItem label="新动作" value="生成 3 道强化题" />
                </div>
              </section>
            </section>
          </div>
        </div>
      </main>
    </div>
  );
}

function LogItem({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-surface p-stack-md border border-outline-variant">
      <p className="font-label-sm text-on-surface-variant mb-1">{label}</p>
      <p className="font-label-md text-on-surface">{value}</p>
    </div>
  );
}
