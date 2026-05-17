import React from 'react';
import { Topbar } from '../components/Topbar';
import { USER_IMAGE } from '../constants';
import { 
  Bot, 
  Paperclip, 
  Send, 
  Lightbulb, 
  Target, 
  ChevronRight, 
  HelpCircle 
} from 'lucide-react';

export default function DashboardView() {
  return (
    <div className="w-full h-screen flex flex-col bg-background">
      <Topbar showSearch={false} />
      
      <main className="md:ml-[var(--sidebar-width,280px)] w-full pt-16 flex flex-col h-[calc(100vh-64px)]">
        <div className="flex-1 flex flex-row overflow-hidden p-container-padding-desktop gap-gutter mx-auto w-full max-w-7xl">
          
          {/* Chat Interface Canvas */}
          <section className="flex-1 flex flex-col bg-surface-container-lowest rounded-xl soft-shadow overflow-hidden border border-outline-variant">
            
            {/* Chat History */}
            <div className="flex-1 overflow-y-auto p-stack-lg flex flex-col gap-stack-lg">
              
              {/* AI Message */}
              <div className="flex gap-stack-md max-w-3xl">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1">
                  <span className="font-label-sm text-on-surface-variant">OmniMind</span>
                  <div className="bg-surface rounded-2xl rounded-tl-sm p-4 text-on-surface font-body-md border border-outline-variant shadow-sm">
                    <p>Welcome back. We left off discussing wave-particle duality in your Quantum Physics 101 module. Would you like to review the double-slit experiment, or should we move on to Schrödinger's equation?</p>
                  </div>
                </div>
              </div>

              {/* User Message */}
              <div className="flex gap-stack-md max-w-3xl self-end flex-row-reverse">
                <div className="w-10 h-10 rounded-full bg-surface-variant shrink-0 overflow-hidden shadow-sm">
                  <img src={USER_IMAGE} alt="User" className="w-full h-full object-cover" />
                </div>
                <div className="flex flex-col gap-1 items-end">
                  <span className="font-label-sm text-on-surface-variant">You</span>
                  <div className="bg-[#007AFF] text-white rounded-2xl rounded-tr-sm p-4 font-body-md shadow-sm">
                    <p>Let's review the double-slit experiment briefly. I'm still a bit fuzzy on how observation collapses the wave function.</p>
                  </div>
                </div>
              </div>

              {/* AI Message */}
              <div className="flex gap-stack-md max-w-3xl">
                <div className="w-10 h-10 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center shrink-0 shadow-sm">
                  <Bot className="w-6 h-6" />
                </div>
                <div className="flex flex-col gap-1 w-full">
                  <span className="font-label-sm text-on-surface-variant">OmniMind</span>
                  <div className="bg-surface rounded-2xl rounded-tl-sm p-5 text-on-surface font-body-md border border-outline-variant shadow-sm w-full">
                    <p className="mb-4">It's one of the most counter-intuitive concepts in physics. Let's break it down into core principles.</p>
                    
                    <div className="bg-surface-bright rounded-lg p-4 border border-outline-variant mb-4">
                      <h4 className="font-label-md font-semibold text-primary mb-2 flex items-center gap-2">
                        <Lightbulb className="w-4 h-4" /> Core Concept
                      </h4>
                      <p className="text-sm text-on-surface-variant">When particles (like electrons or photons) pass through two slits without being observed, they create an interference pattern on the screen behind, acting as a wave of probabilities. The moment a detector is placed to observe which slit the particle goes through, the interference pattern vanishes, and they act purely as particles.</p>
                    </div>
                    
                    <p>This suggests that the very act of measurement affects the system. The mathematical probability wave "collapses" into a single, definite state upon observation. Shall I generate a visual diagram to help illustrate this?</p>
                  </div>
                </div>
              </div>
              
            </div>

            {/* Input Area */}
            <div className="p-stack-md bg-surface border-t border-outline-variant">
              <div className="relative flex items-center bg-[#F5F5F7] rounded-xl border-2 border-transparent focus-within:border-[#007AFF] transition-colors">
                <button className="p-3 text-on-surface-variant hover:text-primary transition-colors">
                  <Paperclip className="w-5 h-5" />
                </button>
                <input 
                  type="text" 
                  className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none font-body-md py-3 px-2 text-on-surface placeholder:text-outline" 
                  placeholder="Ask OmniMind about Quantum Physics..." 
                />
                <button className="p-3 m-1 bg-[#007AFF] text-white rounded-lg hover:opacity-90 transition-opacity flex items-center justify-center">
                  <Send className="w-5 h-5" />
                </button>
              </div>
              <div className="flex justify-between items-center mt-2 px-2">
                <span className="font-label-sm text-outline">Press Enter to send</span>
                <div className="flex gap-2">
                  <span className="px-2 py-1 bg-surface-container-high rounded-full font-label-sm text-on-surface-variant cursor-pointer hover:bg-surface-variant transition-colors">/summarize</span>
                  <span className="px-2 py-1 bg-surface-container-high rounded-full font-label-sm text-on-surface-variant cursor-pointer hover:bg-surface-variant transition-colors">/flashcard</span>
                </div>
              </div>
            </div>

          </section>

          {/* Context / Widgets Sidebar */}
          <aside className="hidden lg:flex flex-col w-[320px] gap-stack-md">
            
            {/* Current Focus Card */}
            <div className="bg-surface-container-lowest rounded-xl p-stack-lg soft-shadow border border-outline-variant hover-scale">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-on-surface">Current Focus</h3>
                <Target className="w-6 h-6 text-primary" />
              </div>
              <div className="mb-6">
                <h4 className="font-label-md font-semibold text-on-surface mb-1">Quantum Physics 101</h4>
                <p className="font-label-sm text-on-surface-variant">Module 3: Wave Mechanics</p>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between font-label-sm">
                  <span className="text-on-surface-variant">Progress</span>
                  <span className="text-primary font-semibold">65%</span>
                </div>
                <div className="w-full h-1 bg-[rgba(0,0,0,0.05)] rounded-full overflow-hidden">
                  <div className="h-full bg-[#007AFF] w-[65%] rounded-full relative overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/30 to-transparent -translate-x-full animate-[shimmer_2s_infinite]"></div>
                  </div>
                </div>
              </div>
              <div className="mt-6 flex flex-col gap-2">
                <button className="w-full py-2 bg-surface-bright border border-outline-variant text-on-surface font-label-md rounded-lg hover:bg-surface-container-high transition-colors text-left px-3 flex justify-between items-center">
                  View Syllabus <ChevronRight className="w-4 h-4" />
                </button>
                <button className="w-full py-2 bg-surface-bright border border-outline-variant text-on-surface font-label-md rounded-lg hover:bg-surface-container-high transition-colors text-left px-3 flex justify-between items-center">
                  Generate Quiz <HelpCircle className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Related Concepts Bento */}
            <div className="bg-surface-container-lowest rounded-xl p-stack-lg soft-shadow border border-outline-variant">
              <h3 className="font-headline-md text-on-surface mb-4">Related Concepts</h3>
              <div className="flex flex-wrap gap-2">
                <span className="px-3 py-1.5 bg-[#F5F5F7] text-[#86868B] rounded-full font-label-sm text-[12px] hover:bg-[#e8e8ea] cursor-pointer transition-colors">Schrödinger's Cat</span>
                <span className="px-3 py-1.5 bg-[#F5F5F7] text-[#86868B] rounded-full font-label-sm text-[12px] hover:bg-[#e8e8ea] cursor-pointer transition-colors">Superposition</span>
                <span className="px-3 py-1.5 bg-[#F5F5F7] text-[#86868B] rounded-full font-label-sm text-[12px] hover:bg-[#e8e8ea] cursor-pointer transition-colors">Heisenberg Principle</span>
                <span className="px-3 py-1.5 bg-[#F5F5F7] text-[#86868B] rounded-full font-label-sm text-[12px] hover:bg-[#e8e8ea] cursor-pointer transition-colors">Quantum Entanglement</span>
              </div>
            </div>

          </aside>

        </div>
      </main>
    </div>
  );
}
