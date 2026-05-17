import React from 'react';
import { Topbar } from '../components/Topbar';
import { knowledgeItems } from '../data/demo';
import {
  AudioLines,
  BrainCircuit,
  FileImage,
  FileText,
  FolderPlus,
  Layers3,
  Plus,
  Search,
  Upload
} from 'lucide-react';

const notebooks = [
  { title: '高数强化', count: 24, memory: '12 条长期记忆', accent: 'bg-primary text-on-primary' },
  { title: '有机化学', count: 18, memory: '7 条薄弱点', accent: 'bg-[#2E7D32] text-white' },
  { title: '英语听力', count: 9, memory: '3 条转写任务', accent: 'bg-[#6D4C41] text-white' }
];

export default function NotesView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="搜索笔记、文件、记忆和来源引用..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-16 p-container-padding-mobile md:p-container-padding-desktop flex flex-col gap-stack-lg max-w-7xl mx-auto w-full">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mt-6">
          <div>
            <h2 className="font-headline-xl-mobile md:font-headline-xl text-on-surface mb-2">知识库</h2>
            <p className="font-body-md text-on-surface-variant">笔记本、文件、手写图片和音频都会进入同一套记忆索引。</p>
          </div>
          <div className="flex gap-stack-sm">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-label-md hover:bg-surface-container-high transition-colors">
              <Upload className="w-4 h-4" />
              上传资料
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md shadow-sm hover:opacity-90 transition-opacity">
              <Plus className="w-4 h-4" />
              新建笔记本
            </button>
          </div>
        </div>

        <section className="grid grid-cols-1 lg:grid-cols-3 gap-gutter">
          <div className="lg:col-span-2 bg-surface-container-lowest rounded-lg p-stack-lg soft-shadow border border-outline-variant">
            <div className="flex items-center justify-between gap-stack-md mb-stack-md">
              <div>
                <h3 className="font-headline-md text-on-surface">文件系统</h3>
                <p className="font-label-sm text-on-surface-variant">Supabase Storage + Postgres metadata</p>
              </div>
              <Search className="w-5 h-5 text-primary" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-stack-md">
              {notebooks.map((folder) => (
                <article key={folder.title} className="rounded-lg border border-outline-variant p-stack-md bg-surface">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-stack-md ${folder.accent}`}>
                    <Layers3 className="w-5 h-5" />
                  </div>
                  <h4 className="font-label-md font-semibold text-on-surface mb-1">{folder.title}</h4>
                  <p className="font-label-sm text-on-surface-variant">{folder.count} 个资料 · {folder.memory}</p>
                </article>
              ))}
              <article className="rounded-lg border border-dashed border-outline-variant p-stack-md bg-surface-container-low flex flex-col items-center justify-center text-on-surface-variant min-h-32">
                <FolderPlus className="w-7 h-7 mb-2" />
                <span className="font-label-md">新笔记本</span>
              </article>
            </div>
          </div>

          <div className="bg-surface-container-lowest rounded-lg p-stack-lg soft-shadow border border-outline-variant">
            <h3 className="font-headline-md text-on-surface mb-stack-md">入库管线</h3>
            <PipelineStep icon={<FileImage />} label="OCR / 手写识别" value="图片、手写笔记" />
            <PipelineStep icon={<AudioLines />} label="音频转写" value="课堂录音、口述复盘" />
            <PipelineStep icon={<BrainCircuit />} label="双层记忆" value="chunk + long-term store" />
          </div>
        </section>

        <section className="bg-surface-container-lowest rounded-lg soft-shadow overflow-hidden border border-outline-variant">
          <div className="grid grid-cols-12 gap-4 p-stack-md border-b border-outline-variant text-on-surface-variant font-label-sm uppercase tracking-wider hidden md:grid">
            <div className="col-span-4">资料</div>
            <div className="col-span-2">类型</div>
            <div className="col-span-2">状态</div>
            <div className="col-span-2">切片</div>
            <div className="col-span-2">更新时间</div>
          </div>

          <div className="flex flex-col">
            {knowledgeItems.map((item) => (
              <div key={item.title} className="grid grid-cols-1 md:grid-cols-12 gap-4 p-stack-md items-center hover:bg-surface-container-low transition-colors border-b border-outline-variant/20 last:border-b-0">
                <div className="md:col-span-4 flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-lg bg-primary-fixed text-on-primary-fixed flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="font-label-md text-on-surface font-medium truncate">{item.title}</p>
                    <p className="font-label-sm text-on-surface-variant md:hidden">{item.type} · {item.status}</p>
                  </div>
                </div>
                <div className="hidden md:block md:col-span-2 font-body-md text-[14px] text-on-surface-variant">{item.type}</div>
                <div className="hidden md:block md:col-span-2">
                  <span className="px-2 py-1 rounded-lg bg-surface-container-high text-on-surface-variant font-label-sm">{item.status}</span>
                </div>
                <div className="hidden md:block md:col-span-2 font-body-md text-[14px] text-on-surface-variant">{item.chunks}</div>
                <div className="hidden md:block md:col-span-2 font-body-md text-[14px] text-on-surface-variant">{item.updated}</div>
              </div>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}

function PipelineStep({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="flex items-center gap-3 py-3 border-b border-outline-variant/40 last:border-b-0">
      <div className="w-9 h-9 rounded-lg bg-surface-container-high text-primary flex items-center justify-center">
        {React.cloneElement(icon as React.ReactElement<{ className?: string }>, { className: 'w-5 h-5' })}
      </div>
      <div>
        <p className="font-label-md text-on-surface">{label}</p>
        <p className="font-label-sm text-on-surface-variant">{value}</p>
      </div>
    </div>
  );
}
