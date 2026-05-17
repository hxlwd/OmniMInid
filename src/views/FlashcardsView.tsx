import React from 'react';
import { Topbar } from '../components/Topbar';
import { weaknessItems } from '../data/demo';
import { Brain, CheckCircle2, CircleHelp, Plus, RotateCcw, Sparkles, Timer } from 'lucide-react';

const practiceSets = [
  { title: '函数极限方法判断', cards: 12, mastery: 38, status: '今日优先', color: 'bg-error text-on-error' },
  { title: '有机反应机理箭头', cards: 9, mastery: 44, status: '反复训练', color: 'bg-[#6D4C41] text-white' },
  { title: '英语听力细节定位', cards: 16, mastery: 72, status: '保持复习', color: 'bg-primary text-on-primary' }
];

const activeItems = [
  '先标出题干中的目标量，再选择方法',
  '写出一个反例，检查概念边界',
  '答完后用一句话记录错因'
];

export default function FlashcardsView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="搜索练习、错因和掌握度..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-24 px-container-padding-mobile md:px-container-padding-desktop pb-container-padding-desktop max-w-7xl mx-auto w-full">
        <div className="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-xl-mobile md:font-headline-xl text-on-surface mb-unit">练习中心</h2>
            <p className="font-body-md text-on-surface-variant">Agent 根据长期记忆和错因生成题组，并把结果写回学习画像。</p>
          </div>
          <button className="bg-primary text-on-primary font-label-md px-5 py-3 rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center gap-2 shadow-sm">
            <Sparkles className="w-5 h-5" />
            生成强化题
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <section className="lg:col-span-8 grid grid-cols-1 md:grid-cols-3 gap-gutter">
            {practiceSets.map((set) => (
              <article key={set.title} className="bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant flex flex-col h-full">
                <div className="flex justify-between items-start mb-stack-md">
                  <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${set.color}`}>
                    <CircleHelp className="w-6 h-6" />
                  </div>
                  <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-lg font-label-sm">{set.cards} 题</span>
                </div>
                <h3 className="font-headline-md text-on-surface mb-unit">{set.title}</h3>
                <p className="text-sm text-on-surface-variant mb-stack-lg flex-1">{set.status}</p>
                <div>
                  <div className="flex justify-between items-end mb-2">
                    <span className="font-label-sm text-primary font-semibold">掌握度</span>
                    <span className="font-label-sm text-on-surface-variant">{set.mastery}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full" style={{ width: `${set.mastery}%` }} />
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="lg:col-span-4 bg-surface-container-lowest rounded-lg p-stack-lg card-shadow border border-outline-variant">
            <div className="flex items-center justify-between mb-stack-md">
              <h3 className="font-headline-md text-on-surface">今日训练</h3>
              <Timer className="w-5 h-5 text-primary" />
            </div>
            <div className="space-y-3">
              {activeItems.map((item, index) => (
                <div key={item} className="flex items-start gap-3 rounded-lg bg-surface p-3 border border-outline-variant">
                  <div className="w-7 h-7 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0 font-label-sm">
                    {index + 1}
                  </div>
                  <p className="font-body-md text-on-surface text-sm">{item}</p>
                </div>
              ))}
            </div>
          </aside>
        </div>

        <section className="mt-gutter bg-surface-container-lowest rounded-lg p-stack-lg border border-outline-variant soft-shadow">
          <div className="flex items-center justify-between mb-stack-md">
            <h3 className="font-headline-md text-on-surface">错因回写</h3>
            <Brain className="w-5 h-5 text-primary" />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-stack-md">
            {weaknessItems.map((item) => (
              <div key={item.label} className="rounded-lg bg-surface p-stack-md border border-outline-variant">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-label-md text-on-surface">{item.label}</p>
                  {item.score > 45 ? <CheckCircle2 className="w-4 h-4 text-[#2E7D32]" /> : <RotateCcw className="w-4 h-4 text-error" />}
                </div>
                <p className="font-label-sm text-on-surface-variant">{item.trend}</p>
              </div>
            ))}
            <button className="rounded-lg border border-dashed border-outline-variant bg-surface-container-low p-stack-md text-on-surface-variant flex items-center justify-center gap-2 font-label-md">
              <Plus className="w-4 h-4" />
              新题组
            </button>
          </div>
        </section>
      </main>
    </div>
  );
}
