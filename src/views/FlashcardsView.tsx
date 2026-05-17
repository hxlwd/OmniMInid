import React from 'react';
import { Topbar } from '../components/Topbar';
import { Plus, Activity, Cpu, Landmark } from 'lucide-react';

export default function FlashcardsView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="Search decks..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-24 px-container-padding-mobile md:px-container-padding-desktop pb-container-padding-desktop">
        <div className="mb-stack-lg flex flex-col sm:flex-row sm:items-end justify-between gap-stack-md">
          <div>
            <h2 className="font-headline-lg font-bold text-on-surface mb-unit">Flashcards</h2>
            <p className="font-body-md text-on-surface-variant">Review your decks and track mastery.</p>
          </div>
          <button className="bg-primary text-on-primary font-label-md px-6 py-3 rounded-lg hover:bg-primary-fixed-variant transition-colors flex items-center justify-center gap-2 shadow-sm">
            <Plus className="w-5 h-5" />
            Create Deck
          </button>
        </div>

        {/* Bento Grid Layout for Decks */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-gutter">
          
          {/* Deck 1: Anatomy 101 */}
          <div className="bg-surface rounded-3xl p-stack-lg card-shadow glass-panel hover-scale cursor-pointer flex flex-col h-full">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="w-12 h-12 rounded-xl bg-error-container text-on-error-container flex items-center justify-center">
                <Activity className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full font-label-sm">120 Cards</span>
            </div>
            <h3 className="font-headline-md text-on-surface mb-unit">Anatomy 101</h3>
            <p className="text-sm text-on-surface-variant mb-stack-lg flex-1">Skeletal and muscular systems focus. Needs urgent review.</p>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-label-sm text-error font-semibold">Urgent Review</span>
                <span className="font-label-sm text-on-surface-variant">15% Mastery</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full mastery-gradient-red rounded-full" style={{ width: '25%' }}></div>
              </div>
            </div>
          </div>

          {/* Deck 2: Machine Learning */}
          <div className="bg-surface rounded-3xl p-stack-lg card-shadow glass-panel hover-scale cursor-pointer flex flex-col h-full">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="w-12 h-12 rounded-xl bg-[rgba(52,199,89,0.1)] text-[#34C759] flex items-center justify-center">
                <Cpu className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full font-label-sm">85 Cards</span>
            </div>
            <h3 className="font-headline-md text-on-surface mb-unit">Machine Learning</h3>
            <p className="text-sm text-on-surface-variant mb-stack-lg flex-1">Neural networks, backpropagation, and optimization algorithms.</p>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-label-sm text-[#34C759] font-semibold">Well Mastered</span>
                <span className="font-label-sm text-on-surface-variant">92% Mastery</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full mastery-gradient-green rounded-full" style={{ width: '92%' }}></div>
              </div>
            </div>
          </div>

          {/* Deck 3: European History */}
          <div className="bg-surface rounded-3xl p-stack-lg card-shadow glass-panel hover-scale cursor-pointer flex flex-col h-full lg:col-span-1 md:col-span-2">
            <div className="flex justify-between items-start mb-stack-md">
              <div className="w-12 h-12 rounded-xl bg-primary-container text-on-primary-container flex items-center justify-center">
                <Landmark className="w-6 h-6" />
              </div>
              <span className="px-3 py-1 bg-surface-container-low text-on-surface-variant rounded-full font-label-sm">210 Cards</span>
            </div>
            <h3 className="font-headline-md text-on-surface mb-unit">European History</h3>
            <p className="text-sm text-on-surface-variant mb-stack-lg flex-1">18th and 19th century political movements and revolutions.</p>
            <div>
              <div className="flex justify-between items-end mb-2">
                <span className="font-label-sm text-[#FFCC00] font-semibold">In Progress</span>
                <span className="font-label-sm text-on-surface-variant">45% Mastery</span>
              </div>
              <div className="h-2 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full mastery-gradient-mixed rounded-full" style={{ width: '45%' }}></div>
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}
