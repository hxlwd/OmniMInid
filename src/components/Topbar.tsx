import React from 'react';
import { Search, Bell, Menu } from 'lucide-react';
import { USER_IMAGE } from '../constants';

interface TopbarProps {
  placeholder?: string;
  showSearch?: boolean;
}

export function Topbar({ placeholder = "Search...", showSearch = true }: TopbarProps) {
  return (
    <header className="fixed top-0 right-0 w-full md:w-[calc(100%_-_var(--sidebar-width,280px))] h-16 bg-surface/80 backdrop-blur-xl shadow-sm z-40 flex items-center justify-between px-gutter">
      <div className="flex items-center gap-stack-md md:hidden">
        <button className="text-on-surface-variant p-2">
          <Menu className="w-6 h-6" />
        </button>
        <h1 className="font-headline-md font-bold text-primary hidden sm:block">OmniMind</h1>
      </div>
      
      <div className="flex-1 flex justify-start md:justify-start pl-0 md:pl-0 w-full max-w-2xl">
        {showSearch && (
          <div className="relative w-full hidden sm:block max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant w-5 h-5" />
            <input 
              type="text" 
              placeholder={placeholder}
              className="w-full pl-10 pr-4 py-2 bg-surface-container-low border-none rounded-full font-body-md text-on-surface placeholder:text-on-surface-variant/70 focus:ring-2 focus:ring-primary focus:bg-surface focus:outline-none transition-all" 
            />
          </div>
        )}
      </div>

      <div className="flex items-center gap-stack-md ml-auto pl-gutter">
        <button className="text-on-surface-variant hover:text-primary transition-colors p-2 rounded-full hover:bg-surface-container-high">
          <Bell className="w-5 h-5" />
        </button>
        <div className="w-8 h-8 rounded-full bg-surface-variant overflow-hidden border border-outline-variant cursor-pointer hover:opacity-80 transition-opacity flex-shrink-0">
          <img 
            src={USER_IMAGE} 
            alt="User Profile" 
            className="w-full h-full object-cover" 
          />
        </div>
      </div>
    </header>
  );
}
