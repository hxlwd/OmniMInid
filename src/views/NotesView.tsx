import React from 'react';
import { Topbar } from '../components/Topbar';
import { CELLULAR_IMAGE, ORGANIC_CHEM_IMAGE } from '../constants';
import { 
  Upload, 
  Plus, 
  Folder, 
  MoreHorizontal, 
  FolderPlus, 
  Play, 
  Sparkles, 
  Edit, 
  FileText, 
  Network, 
  Download, 
  MoreVertical 
} from 'lucide-react';

export default function NotesView() {
  return (
    <div className="w-full flex flex-col min-h-screen bg-background">
      <Topbar placeholder="Search across all notebooks and files..." />

      <main className="flex-1 md:ml-[var(--sidebar-width,280px)] pt-16 p-container-padding-mobile md:p-container-padding-desktop flex flex-col gap-stack-lg max-w-7xl mx-auto w-full">
        
        {/* Page Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-stack-md mt-6">
          <div>
            <h2 className="font-headline-xl text-on-surface mb-2">My Notes</h2>
            <p className="font-body-md text-on-surface-variant">Organize your thoughts, synthesize documents, and review materials.</p>
          </div>
          <div className="flex gap-stack-sm">
            <button className="flex items-center gap-2 px-4 py-2 bg-surface-container-low text-on-surface rounded-lg font-label-md hover:bg-surface-container-high transition-colors">
              <Upload className="w-4 h-4" />
              Upload
            </button>
            <button className="flex items-center gap-2 px-4 py-2 bg-primary text-on-primary rounded-lg font-label-md shadow-sm hover:scale-[1.02] transition-transform">
              <Plus className="w-4 h-4" />
              New Notebook
            </button>
          </div>
        </div>

        {/* Folders Section */}
        <section className="flex flex-col gap-stack-sm mt-4">
          <h3 className="font-headline-md text-on-surface mb-2">Folders</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            
            <div className="bg-surface-container-lowest rounded-[24px] p-stack-md soft-shadow hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                  <Folder className="w-5 h-5 fill-current" />
                </div>
                <MoreHorizontal className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5" />
              </div>
              <h4 className="font-label-md text-on-surface font-semibold mb-1">Biology 101</h4>
              <p className="font-label-sm text-on-surface-variant">12 items • Updated 2d ago</p>
            </div>

            <div className="bg-surface-container-lowest rounded-[24px] p-stack-md soft-shadow hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-[#E8F5E9] flex items-center justify-center text-[#2E7D32] group-hover:bg-[#2E7D32] group-hover:text-white transition-colors">
                  <Folder className="w-5 h-5 fill-current" />
                </div>
                <MoreHorizontal className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5" />
              </div>
              <h4 className="font-label-md text-on-surface font-semibold mb-1">Organic Chemistry</h4>
              <p className="font-label-sm text-on-surface-variant">8 items • Updated 5h ago</p>
            </div>

            <div className="bg-surface-container-lowest rounded-[24px] p-stack-md soft-shadow hover:scale-[1.02] hover:shadow-md transition-all cursor-pointer border border-transparent hover:border-primary/20 group">
              <div className="flex items-center justify-between mb-4">
                <div className="w-10 h-10 rounded-full bg-[#FFF3E0] flex items-center justify-center text-[#E65100] group-hover:bg-[#E65100] group-hover:text-white transition-colors">
                  <Folder className="w-5 h-5 fill-current" />
                </div>
                <MoreHorizontal className="text-on-surface-variant opacity-0 group-hover:opacity-100 transition-opacity w-5 h-5" />
              </div>
              <h4 className="font-label-md text-on-surface font-semibold mb-1">Literature Seminar</h4>
              <p className="font-label-sm text-on-surface-variant">24 items • Updated 1w ago</p>
            </div>

            <div className="bg-surface-container-low rounded-[24px] p-stack-md border border-dashed border-outline-variant flex flex-col items-center justify-center hover:bg-surface-container-high transition-colors cursor-pointer text-on-surface-variant hover:text-primary">
              <FolderPlus className="w-8 h-8 mb-2" />
              <span className="font-label-md">New Folder</span>
            </div>

          </div>
        </section>

        {/* Notebooks Section */}
        <section className="flex flex-col gap-stack-sm mt-stack-md">
          <div className="flex items-center justify-between mb-2">
            <h3 className="font-headline-md text-on-surface">Recent Notebooks</h3>
            <a href="#" className="font-label-sm text-primary hover:underline">View All</a>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-gutter">
            
            {/* Notebook 1 */}
            <div className="bg-surface-container-lowest rounded-[24px] overflow-hidden soft-shadow group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
              <div className="h-40 w-full relative overflow-hidden bg-surface-variant">
                <img src={CELLULAR_IMAGE} alt="Biology" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors ml-auto">
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
              <div className="p-stack-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-[10px] uppercase tracking-wider">Biology 101</span>
                </div>
                <h4 className="font-label-md font-semibold text-on-surface mb-1 line-clamp-1">Cellular Respiration</h4>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Sparkles className="w-3.5 h-3.5" />
                  <p className="font-label-sm text-[12px]">AI Synthesized</p>
                </div>
              </div>
            </div>

            {/* Notebook 2 */}
            <div className="bg-surface-container-lowest rounded-[24px] overflow-hidden soft-shadow group cursor-pointer hover:-translate-y-1 transition-transform duration-300">
              <div className="h-40 w-full relative overflow-hidden bg-surface-variant">
                <img src={ORGANIC_CHEM_IMAGE} alt="Chemistry" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <button className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-primary transition-colors ml-auto">
                    <Play className="w-4 h-4 fill-current" />
                  </button>
                </div>
              </div>
              <div className="p-stack-md">
                <div className="flex items-center gap-2 mb-2">
                  <span className="px-2 py-1 rounded-full bg-surface-container-low text-on-surface-variant font-label-sm text-[10px] uppercase tracking-wider">Organic Chem</span>
                </div>
                <h4 className="font-label-md font-semibold text-on-surface mb-1 line-clamp-1">Reaction Mechanisms</h4>
                <div className="flex items-center gap-1 text-on-surface-variant">
                  <Edit className="w-3.5 h-3.5" />
                  <p className="font-label-sm text-[12px]">Last edited 2h ago</p>
                </div>
              </div>
            </div>

          </div>
        </section>

        {/* Documents List */}
        <section className="flex flex-col gap-stack-sm mt-stack-md">
          <h3 className="font-headline-md text-on-surface mb-2">Recent Documents</h3>
          <div className="bg-surface-container-lowest rounded-[24px] soft-shadow overflow-hidden">
            <div className="grid grid-cols-12 gap-4 p-stack-md border-b border-outline-variant/30 text-on-surface-variant font-label-sm uppercase tracking-wider hidden sm:grid">
              <div className="col-span-6 md:col-span-5">Name</div>
              <div className="col-span-3 md:col-span-3">Date Added</div>
              <div className="col-span-3 md:col-span-2">Size</div>
              <div className="hidden md:block col-span-2 text-right">Actions</div>
            </div>

            <div className="flex flex-col">
              {/* Item 1 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-stack-md items-center hover:bg-surface-container-low transition-colors border-b border-outline-variant/10 group cursor-pointer">
                <div className="col-span-1 sm:col-span-6 md:col-span-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[#FFEBEE] flex items-center justify-center text-[#D32F2F] shrink-0">
                    <FileText className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface font-medium truncate">Syllabus_Bio101_Fall.pdf</p>
                    <p className="font-label-sm text-on-surface-variant sm:hidden">Added Oct 12 • 2.4 MB</p>
                  </div>
                </div>
                <div className="hidden sm:block col-span-3 md:col-span-3 font-body-md text-[14px] text-on-surface-variant">Oct 12, 2023</div>
                <div className="hidden sm:block col-span-3 md:col-span-2 font-body-md text-[14px] text-on-surface-variant">2.4 MB</div>
                <div className="hidden md:flex col-span-2 justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Item 2 */}
              <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-stack-md items-center hover:bg-surface-container-low transition-colors group cursor-pointer">
                <div className="col-span-1 sm:col-span-6 md:col-span-5 flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-surface-variant flex items-center justify-center text-on-surface-variant shrink-0">
                    <Network className="w-5 h-5 fill-current" />
                  </div>
                  <div>
                    <p className="font-label-md text-on-surface font-medium truncate">Metabolic_Pathways.xmind</p>
                    <p className="font-label-sm text-on-surface-variant sm:hidden">Added Oct 10 • 856 KB</p>
                  </div>
                </div>
                <div className="hidden sm:block col-span-3 md:col-span-3 font-body-md text-[14px] text-on-surface-variant">Oct 10, 2023</div>
                <div className="hidden sm:block col-span-3 md:col-span-2 font-body-md text-[14px] text-on-surface-variant">856 KB</div>
                <div className="hidden md:flex col-span-2 justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant hover:text-primary transition-colors">
                    <Download className="w-4 h-4" />
                  </button>
                  <button className="p-2 rounded-full hover:bg-surface-variant text-on-surface-variant transition-colors">
                    <MoreVertical className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

      </main>
    </div>
  );
}
