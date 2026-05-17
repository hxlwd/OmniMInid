import React, { useState, useEffect, useRef } from 'react';
import { 
  LayoutDashboard, 
  FileText, 
  Library, 
  User, 
  Settings, 
  HelpCircle,
  BrainCircuit
} from 'lucide-react';
import { ViewScope } from '../types';

interface SidebarProps {
  currentView: ViewScope;
  onChangeView: (view: ViewScope) => void;
}

export function Sidebar({ currentView, onChangeView }: SidebarProps) {
  const [width, setWidth] = useState(280);
  const isDragging = useRef(false);

  useEffect(() => {
    document.documentElement.style.setProperty('--sidebar-width', `${width}px`);
  }, [width]);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      let newWidth = e.clientX;
      if (newWidth < 200) newWidth = 200;
      if (newWidth > 600) newWidth = 600;
      setWidth(newWidth);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.classList.remove('select-none');
        document.body.style.cursor = '';
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const getNavClass = (view: ViewScope) => {
    const baseClass = "flex items-center gap-stack-md px-stack-md py-stack-sm rounded-lg font-label-md transition-colors duration-200 cursor-pointer ";
    if (currentView === view) {
      return baseClass + "bg-primary-container text-on-primary-container scale-[0.98]";
    }
    return baseClass + "text-on-surface-variant hover:bg-surface-container-high group-hover:text-primary";
  };

  return (
    <nav 
      className="hidden md:flex flex-col h-full p-gutter fixed left-0 top-0 bg-surface/80 backdrop-blur-xl border-r border-outline-variant z-50 will-change-[width]"
      style={{ width: `var(--sidebar-width, 280px)` }}
    >
      <div 
        className="absolute right-0 top-0 bottom-0 w-2 hover:bg-primary/30 cursor-col-resize transition-colors z-50"
        style={{ transform: 'translateX(50%)' }}
        onMouseDown={() => {
          isDragging.current = true;
          document.body.classList.add('select-none');
          document.body.style.cursor = 'col-resize';
        }}
      />
      
      <div className="mb-stack-lg flex items-center gap-stack-md min-w-0">
        <div className="w-10 h-10 rounded-lg bg-primary text-on-primary flex items-center justify-center shrink-0">
          <BrainCircuit className="w-6 h-6" />
        </div>
        <div className="min-w-0">
          <p className="font-headline-md text-on-surface truncate">OmniMind</p>
          <p className="font-label-sm text-on-surface-variant truncate">学习 Agent 中枢</p>
        </div>
      </div>

      <div className="flex-1 flex flex-col gap-2 mt-stack-md pt-2">
        <a className={getNavClass('dashboard')} onClick={(e) => { e.preventDefault(); onChangeView('dashboard'); }}>
          <LayoutDashboard className="w-5 h-5" />
          Agent 工作台
        </a>
        <a className={getNavClass('notes')} onClick={(e) => { e.preventDefault(); onChangeView('notes'); }}>
          <FileText className="w-5 h-5" />
          知识库
        </a>
        <a className={getNavClass('flashcards')} onClick={(e) => { e.preventDefault(); onChangeView('flashcards'); }}>
          <Library className="w-5 h-5" />
          练习中心
        </a>
        <a className={getNavClass('profile')} onClick={(e) => { e.preventDefault(); onChangeView('profile'); }}>
          <User className="w-5 h-5" />
          学习画像
        </a>
      </div>
      
      <div className="flex flex-col gap-2 mt-auto pt-stack-md border-t border-outline-variant/30">
        <a className={getNavClass('settings')} onClick={(e) => { e.preventDefault(); onChangeView('settings'); }}>
          <Settings className="w-5 h-5" />
          设置
        </a>
        <a className="flex items-center gap-stack-md px-stack-md py-stack-sm text-on-surface-variant hover:bg-surface-container-high rounded-lg font-label-md transition-colors duration-200 cursor-pointer">
          <HelpCircle className="w-5 h-5" />
          帮助
        </a>
      </div>
    </nav>
  );
}
