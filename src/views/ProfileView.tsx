import React from 'react';
import { Topbar } from '../components/Topbar';
import { PROFILE_IMAGE } from '../constants';
import { Edit2, Clock, ArrowUp, Brain, MoreHorizontal } from 'lucide-react';

export default function ProfileView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="Search insights..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-24 px-container-padding-mobile md:px-container-padding-desktop pb-container-padding-desktop">
        <div className="max-w-6xl mx-auto">
          
          {/* Page Header */}
          <div className="mb-stack-lg">
            <h1 className="font-headline-xl-mobile md:font-headline-xl text-on-surface mb-stack-sm">Learning Profile</h1>
            <p className="font-body-lg text-on-surface-variant">Track your intellectual synthesis and mastery progress.</p>
          </div>

          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-12 gap-gutter">
            
            {/* Bio Card */}
            <div className="md:col-span-4 bg-surface rounded-[24px] p-stack-lg card-shadow hover-scale flex flex-col items-center text-center">
              <div className="w-32 h-32 rounded-full overflow-hidden mb-stack-md border-4 border-surface-bright shadow-sm relative">
                <img src={PROFILE_IMAGE} alt="Alex Mercer" className="w-full h-full object-cover" />
              </div>
              <h2 className="font-headline-md text-on-surface mb-1">Alex Mercer</h2>
              <p className="font-body-md text-primary font-medium mb-stack-md">Graduate Student</p>
              
              <div className="flex flex-wrap justify-center gap-2 mb-stack-lg">
                <span className="bg-surface-container-low text-tertiary px-3 py-1 rounded-full font-label-sm">Computer Science</span>
                <span className="bg-surface-container-low text-tertiary px-3 py-1 rounded-full font-label-sm">AI Ethics</span>
                <span className="bg-surface-container-low text-tertiary px-3 py-1 rounded-full font-label-sm">Linguistics</span>
              </div>
              
              <button className="w-full bg-surface-container-high text-on-surface py-3 rounded-lg font-label-md hover:bg-surface-variant transition-colors flex justify-center items-center gap-2">
                <Edit2 className="w-5 h-5" />
                Edit Profile
              </button>
            </div>

            {/* Quick Stats & Analytics */}
            <div className="md:col-span-8 flex flex-col gap-gutter">
              
              {/* Top Stats Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-gutter">
                <div className="bg-surface rounded-[24px] p-stack-lg card-shadow hover-scale">
                  <div className="flex justify-between items-start mb-stack-md">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Clock className="w-6 h-6" />
                    </div>
                    <span className="text-on-surface-variant font-label-sm flex items-center gap-1">
                      <ArrowUp className="text-green-600 w-4 h-4" /> +12% this week
                    </span>
                  </div>
                  <h3 className="font-label-md text-on-surface-variant mb-1">Total Study Hours</h3>
                  <p className="font-headline-lg text-on-surface">142<span className="font-body-md text-on-surface-variant ml-1">hrs</span></p>
                </div>

                <div className="bg-surface rounded-[24px] p-stack-lg card-shadow hover-scale">
                  <div className="flex justify-between items-start mb-stack-md">
                    <div className="p-3 bg-primary/10 rounded-xl text-primary">
                      <Brain className="w-6 h-6" />
                    </div>
                    <span className="text-on-surface-variant font-label-sm flex items-center gap-1">
                      <ArrowUp className="text-green-600 w-4 h-4" /> +45 new
                    </span>
                  </div>
                  <h3 className="font-label-md text-on-surface-variant mb-1">Cards Mastered</h3>
                  <p className="font-headline-lg text-on-surface">1,205</p>
                </div>
              </div>

              {/* Mastery & Activity Row */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-gutter flex-1">
                
                {/* Subject Mastery Donut */}
                <div className="bg-surface rounded-[24px] p-stack-lg card-shadow hover-scale flex flex-col">
                  <h3 className="font-headline-md text-on-surface mb-stack-md">Subject Mastery</h3>
                  <div className="flex-1 flex items-center justify-center relative min-h-[200px]">
                    <div className="w-48 h-48 chart-donut relative flex items-center justify-center">
                      <div className="w-32 h-32 bg-surface rounded-full flex flex-col items-center justify-center z-10 absolute shadow-inner">
                        <span className="font-headline-md text-on-surface">84%</span>
                        <span className="font-label-sm text-on-surface-variant">Overall</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-stack-md flex flex-wrap justify-center gap-x-4 gap-y-2">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-surface-tint"></div>
                      <span className="font-label-sm text-on-surface-variant">Data Structures</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary-container"></div>
                      <span className="font-label-sm text-on-surface-variant">NLP</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-primary-fixed"></div>
                      <span className="font-label-sm text-on-surface-variant">Algorithms</span>
                    </div>
                  </div>
                </div>

                {/* Weekly Activity Bar Chart */}
                <div className="bg-surface rounded-[24px] p-stack-lg card-shadow hover-scale flex flex-col">
                  <div className="flex justify-between items-center mb-stack-lg">
                    <h3 className="font-headline-md text-on-surface">Weekly Activity</h3>
                    <button className="text-on-surface-variant p-1 rounded hover:bg-surface-container-high transition-colors">
                      <MoreHorizontal className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex-1 flex items-end justify-between gap-2 h-[200px] mt-auto">
                    {[
                      { l: 'M', h: '40%', v: '2.1h' },
                      { l: 'T', h: '65%', v: '3.5h' },
                      { l: 'W', h: '90%', v: '4.8h', active: true },
                      { l: 'T', h: '30%', v: '1.5h' },
                      { l: 'F', h: '75%', v: '4.0h' },
                      { l: 'S', h: '20%', v: '1.0h' },
                      { l: 'S', h: '10%', v: '0.5h' },
                    ].map((bar, i) => (
                      <div key={i} className="w-full flex flex-col items-center gap-2">
                        <div 
                          className={`w-full ${bar.active ? 'bg-primary shadow-md' : 'bg-surface-container-high hover:bg-primary-fixed'} rounded-t-sm transition-colors group relative`}
                          style={{ height: bar.h }}
                        >
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 bg-inverse-surface text-inverse-on-surface px-2 py-1 rounded font-label-sm opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            {bar.v}
                          </div>
                        </div>
                        <span className={`font-label-sm ${bar.active ? 'text-on-surface font-bold' : 'text-on-surface-variant'}`}>{bar.l}</span>
                      </div>
                    ))}
                  </div>
                </div>

              </div>
            </div>

          </div>
        </div>
      </main>
    </div>
  );
}
