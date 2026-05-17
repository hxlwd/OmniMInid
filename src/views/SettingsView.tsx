import React from 'react';
import { Topbar } from '../components/Topbar';
import { User, Bot, CreditCard, ChevronDown, Info } from 'lucide-react';

export default function SettingsView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="Search settings..." showSearch={false} />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-16 p-container-padding-mobile md:p-container-padding-desktop">
        <div className="max-w-4xl mx-auto">
          <header className="mb-stack-lg mt-6">
            <h2 className="font-headline-xl text-on-surface">Settings</h2>
            <p className="font-body-lg text-on-surface-variant mt-stack-sm">Manage your account preferences and AI model configurations.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-stack-lg">
            {/* Left Column: Navigation/Sections */}
            <div className="md:col-span-4 flex flex-col gap-stack-md">
              <div className="bg-surface-container-lowest rounded-xl p-stack-md shadow-[0_10px_30px_rgba(0,0,0,0.04)] sticky top-[88px]">
                <nav className="flex flex-col gap-1">
                  <a href="#account" className="px-stack-md py-stack-sm rounded-lg bg-surface-container-high text-primary font-label-md font-bold flex items-center gap-2">
                    <User className="w-5 h-5" />
                    Account Preferences
                  </a>
                  <a href="#ai-config" className="px-stack-md py-stack-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md flex items-center gap-2 transition-colors">
                    <Bot className="w-5 h-5" />
                    AI Model Configuration
                  </a>
                  <a href="#billing" className="px-stack-md py-stack-sm rounded-lg text-on-surface-variant hover:bg-surface-container-low font-label-md flex items-center gap-2 transition-colors">
                    <CreditCard className="w-5 h-5" />
                    Billing & Plans
                  </a>
                </nav>
              </div>
            </div>

            {/* Right Column: Settings Content */}
            <div className="md:col-span-8 flex flex-col gap-stack-lg">
              
              {/* Account Preferences Card */}
              <section id="account" className="bg-surface-container-lowest rounded-xl p-stack-lg shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:scale-[1.01] transition-transform duration-300">
                <h3 className="font-headline-md text-on-surface mb-stack-md border-b border-surface-variant pb-stack-sm">Account Preferences</h3>
                <div className="space-y-stack-md">
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-stack-sm">Display Name</label>
                    <input 
                      type="text" 
                      defaultValue="Jane Doe"
                      className="w-full bg-surface-container-low border-none rounded-lg px-stack-md py-stack-sm font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:outline-none transition-all" 
                    />
                  </div>
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-stack-sm">Email Address</label>
                    <input 
                      type="email" 
                      defaultValue="jane.doe@example.com"
                      className="w-full bg-surface-container-low border-none rounded-lg px-stack-md py-stack-sm font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest focus:outline-none transition-all" 
                    />
                  </div>
                  <div className="flex items-center justify-between pt-stack-sm">
                    <div>
                      <p className="font-label-md text-on-surface">Dark Mode</p>
                      <p className="font-body-md text-on-surface-variant text-sm">Switch to a darker theme for low-light environments.</p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input type="checkbox" className="sr-only peer" />
                      <div className="w-11 h-6 bg-surface-variant peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-primary rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                    </label>
                  </div>
                </div>
                <div className="mt-stack-lg pt-stack-md border-t border-surface-variant flex justify-end">
                  <button className="bg-primary text-on-primary font-label-md px-6 py-2 rounded-lg hover:bg-on-primary-fixed-variant transition-colors">
                    Save Changes
                  </button>
                </div>
              </section>

              {/* AI Configuration Card */}
              <section id="ai-config" className="bg-surface-container-lowest rounded-[24px] p-stack-lg shadow-[0_10px_30px_rgba(0,0,0,0.04)] hover:scale-[1.01] transition-transform duration-300 relative overflow-hidden">
                <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary-fixed opacity-50 rounded-full blur-3xl pointer-events-none"></div>
                <h3 className="font-headline-md text-on-surface mb-stack-md flex items-center gap-2 border-b border-surface-variant pb-stack-sm">
                  <Bot className="text-primary w-6 h-6" />
                  AI Model Configuration
                </h3>
                <div className="space-y-stack-lg relative z-10">
                  <div>
                    <label className="block font-label-md text-on-surface-variant mb-stack-sm">Primary AI Model</label>
                    <p className="font-body-md text-on-surface-variant text-sm mb-stack-sm">Select the core engine powering your insights.</p>
                    <div className="relative">
                      <select className="w-full appearance-none bg-surface-container-low border-none rounded-lg px-stack-md py-stack-sm pr-10 font-body-md text-on-surface focus:ring-2 focus:ring-primary focus:bg-surface-container-lowest outline-none transition-all cursor-pointer">
                        <option value="gpt4o">GPT-4o (Recommended)</option>
                        <option value="claude35">Claude 3.5 Sonnet</option>
                        <option value="gemini">Gemini 1.5 Pro</option>
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-on-surface-variant">
                        <ChevronDown className="w-5 h-5" />
                      </div>
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between items-center mb-stack-sm">
                      <label className="block font-label-md text-on-surface-variant">Creativity (Temperature)</label>
                      <span className="bg-surface-container-low px-2 py-1 rounded font-label-sm text-primary">0.7</span>
                    </div>
                    <p className="font-body-md text-on-surface-variant text-sm mb-stack-md">Lower values produce focused, deterministic outputs. Higher values encourage creative exploration.</p>
                    <div className="relative w-full h-1 bg-surface-variant rounded-full mt-stack-md">
                      <div className="absolute top-0 left-0 h-full bg-primary rounded-full w-[70%]"></div>
                      <div className="absolute top-1/2 left-[70%] w-5 h-5 bg-surface-container-lowest border-2 border-primary rounded-full -translate-y-1/2 -translate-x-1/2 shadow-sm cursor-grab"></div>
                    </div>
                    <div className="flex justify-between text-xs font-label-sm text-outline mt-2">
                      <span>Precise</span>
                      <span>Balanced</span>
                      <span>Creative</span>
                    </div>
                  </div>

                  <div className="bg-surface-container-low p-stack-md rounded-xl border border-outline-variant/30">
                    <h4 className="font-label-md text-on-surface mb-2 flex items-center gap-1">
                      <Info className="w-4 h-4" />
                      System Prompt Persona
                    </h4>
                    <p className="font-body-md text-on-surface-variant text-sm">Your AI is currently configured to act as an "expert academic tutor" prioritizing concise explanations and Socratic questioning.</p>
                    <button className="mt-3 text-primary font-label-sm hover:underline">Edit Persona (Advanced)</button>
                  </div>
                </div>
              </section>

            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
