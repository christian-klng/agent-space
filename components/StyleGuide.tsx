import React from 'react';
import { ArrowRight, Search, Plus, MoreHorizontal, Bell, Check, Command, Layout } from 'lucide-react';

export const StyleGuide: React.FC = () => {
  return (
    <div className="h-full bg-white overflow-y-auto custom-scrollbar">
      <div className="max-w-5xl mx-auto p-12 space-y-20">
        
        {/* Header */}
        <div className="border-b border-gray-100 pb-10">
          <div className="flex items-center gap-3 mb-4">
            <div className="p-2 bg-gray-900 rounded-lg text-white">
                <Layout className="w-6 h-6" />
            </div>
            <h1 className="text-3xl font-semibold text-gray-900 tracking-tight">Design System</h1>
          </div>
          <p className="text-gray-500 max-w-2xl text-lg leading-relaxed">
            A collection of interface components and visual styles representing the Linear-inspired design language. 
            Focused on minimalism, subtle borders, and refined typography.
          </p>
        </div>

        {/* Typography */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-6">Typography</h2>
          </div>
          <div className="md:col-span-9 grid grid-cols-1 gap-12">
            <div className="space-y-6 border-b border-gray-100 pb-12">
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-400 font-mono">text-4xl font-semibold</span>
                    <h1 className="text-4xl font-semibold text-gray-900 tracking-tight">The quick brown fox</h1>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-400 font-mono">text-2xl font-semibold</span>
                    <h2 className="text-2xl font-semibold text-gray-900 tracking-tight">Jumps over the lazy dog</h2>
                </div>
                <div className="flex flex-col gap-2">
                    <span className="text-xs text-gray-400 font-mono">text-xl font-medium</span>
                    <h3 className="text-xl font-medium text-gray-900">Linear Design System</h3>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <span className="text-xs text-gray-400 font-mono block mb-2">Body Regular (text-base)</span>
                <p className="text-base text-gray-600 leading-relaxed">
                   Inter is used as the primary typeface. It is a variable font family carefully crafted & designed for computer screens. It features a tall x-height to aid in readability of mixed-case and lower-case text.
                </p>
              </div>
              <div className="space-y-4">
                 <span className="text-xs text-gray-400 font-mono block mb-2">Body Small (text-sm)</span>
                <p className="text-sm text-gray-500 leading-relaxed">
                  Secondary text and UI elements use the small size. It provides higher information density while maintaining legibility. Perfect for sidebars, cards, and metadata.
                </p>
              </div>
            </div>
            
            <div className="flex gap-8 items-start">
                 <div>
                    <p className="text-xs text-gray-400 mb-1">Caption</p>
                    <p className="text-xs text-gray-500">12 minutes ago</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 mb-1">Label</p>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">PROJECT SETTINGS</p>
                 </div>
                 <div>
                    <p className="text-xs text-gray-400 mb-1">Code</p>
                    <code className="text-xs bg-gray-100 px-1.5 py-0.5 rounded text-gray-700 border border-gray-200">git commit -m "feat: init"</code>
                 </div>
            </div>
          </div>
        </section>

        {/* Colors */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-8 border-t border-gray-100">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-6">Color Palette</h2>
          </div>
          <div className="md:col-span-9">
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
              {[50, 100, 200, 300, 400, 500, 600, 700, 800, 900].map((shade) => (
                <div key={shade} className="group cursor-pointer">
                  <div className={`h-16 w-full rounded-lg border border-gray-100 bg-gray-${shade} shadow-sm group-hover:shadow-md transition-shadow relative overflow-hidden`}>
                     <div className="absolute inset-0 bg-white opacity-0 group-hover:opacity-10 transition-opacity"></div>
                  </div>
                  <div className="mt-2 px-1">
                    <p className="text-xs font-medium text-gray-900">Gray {shade}</p>
                    <p className="text-[10px] text-gray-400 font-mono">
                         {/* Hardcoded hex values matching index.html config roughly for display */}
                        {shade === 900 ? '#111827' : shade === 50 ? '#F9FAFB' : `gray-${shade}`}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Components */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-8 border-t border-gray-100">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-6">Buttons & Controls</h2>
          </div>
          <div className="md:col-span-9 space-y-10">
             
             {/* Buttons Row */}
             <div className="space-y-4">
                 <h3 className="text-sm font-medium text-gray-900">Button Variants</h3>
                 <div className="flex flex-wrap gap-4 items-center">
                    <button className="px-3 py-1.5 bg-gray-900 hover:bg-gray-800 text-white text-sm font-medium rounded-md transition-colors shadow-sm flex items-center gap-2">
                      Primary Action
                    </button>
                    <button className="px-3 py-1.5 bg-white border border-gray-200 hover:bg-gray-50 hover:border-gray-300 text-gray-700 text-sm font-medium rounded-md transition-all shadow-sm">
                      Secondary
                    </button>
                    <button className="px-3 py-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 text-sm font-medium rounded-md transition-colors">
                      Ghost Button
                    </button>
                    <button className="px-3 py-1.5 bg-gray-900 text-white text-sm font-medium rounded-md opacity-50 cursor-not-allowed flex items-center gap-2">
                        Disabled
                    </button>
                 </div>
             </div>

             {/* Icons Row */}
             <div className="space-y-4">
                 <h3 className="text-sm font-medium text-gray-900">Icon Buttons</h3>
                 <div className="flex gap-4">
                    <button className="p-2 bg-white border border-gray-200 rounded-md text-gray-500 hover:text-gray-900 hover:border-gray-300 transition-colors shadow-sm">
                      <MoreHorizontal className="w-4 h-4" />
                    </button>
                    <button className="p-2 bg-gray-900 rounded-md text-white hover:bg-gray-800 transition-colors shadow-sm">
                      <Plus className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors">
                      <Bell className="w-4 h-4" />
                    </button>
                 </div>
             </div>

             {/* Badges */}
             <div className="space-y-4">
                <h3 className="text-sm font-medium text-gray-900">Badges & Tags</h3>
                <div className="flex gap-3">
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">
                        Default
                    </span>
                    <span className="inline-flex items-center px-2 py-1 rounded text-xs font-medium bg-gray-900 text-white">
                        Solid
                    </span>
                    <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium bg-white text-gray-700 border border-gray-200 shadow-sm">
                        <div className="w-1.5 h-1.5 rounded-full bg-green-500"></div>
                        Online
                    </span>
                </div>
             </div>
          </div>
        </section>

        {/* Inputs */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-8 border-t border-gray-100">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-6">Inputs & Forms</h2>
          </div>
          <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-8">
             <div className="space-y-4">
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Email Address</label>
                    <input 
                      type="text" 
                      placeholder="name@company.com"
                      className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors placeholder:text-gray-400"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1.5">Search</label>
                    <div className="relative group">
                        <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400 group-focus-within:text-gray-600 transition-colors" />
                        <input 
                        type="text" 
                        placeholder="Search for..."
                        className="w-full pl-9 pr-12 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-300 focus:bg-white transition-all"
                        />
                        <div className="absolute right-3 top-2.5 flex items-center gap-1 pointer-events-none">
                            <span className="text-[10px] text-gray-400 border border-gray-200 rounded px-1.5 py-0.5 bg-white"><Command className="w-3 h-3 inline" /> K</span>
                        </div>
                    </div>
                </div>
             </div>
             
             <div className="space-y-4">
                <div className="p-4 border border-gray-200 rounded-xl bg-gray-50/50">
                    <div className="flex items-center justify-between mb-3">
                         <span className="text-sm font-medium text-gray-900">Toggle Switch</span>
                         <div className="w-9 h-5 bg-gray-900 rounded-full relative cursor-pointer">
                             <div className="absolute right-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                         </div>
                    </div>
                    <div className="flex items-center justify-between">
                         <span className="text-sm font-medium text-gray-500">Toggle Off</span>
                         <div className="w-9 h-5 bg-gray-200 rounded-full relative cursor-pointer">
                             <div className="absolute left-1 top-1 w-3 h-3 bg-white rounded-full shadow-sm"></div>
                         </div>
                    </div>
                </div>
             </div>
          </div>
        </section>

        {/* Cards */}
        <section className="grid grid-cols-1 md:grid-cols-12 gap-12 pt-8 border-t border-gray-100 pb-20">
          <div className="md:col-span-3">
            <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider sticky top-6">Surfaces</h2>
          </div>
          <div className="md:col-span-9 grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Standard Card */}
            <div className="group relative bg-white border border-gray-200 rounded-xl p-5 hover:border-gray-300 hover:shadow-[0_2px_8px_rgba(0,0,0,0.04)] transition-all cursor-pointer">
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
                    <Layout className="w-5 h-5" />
                </div>
                <div className="px-2 py-1 bg-gray-50 rounded-md border border-gray-100 text-[10px] font-medium text-gray-500 uppercase tracking-wide">
                    Component
                </div>
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Interactive Card</h3>
              <p className="text-sm text-gray-500">
                The standard surface for objects in the interface. Features a subtle border change and elevation lift on hover.
              </p>
            </div>

            {/* Dashed / Empty State */}
            <div className="border border-dashed border-gray-300 rounded-xl p-5 bg-gray-50/50 flex flex-col items-center justify-center text-center hover:bg-gray-50 transition-colors cursor-pointer min-h-[160px]">
                <div className="w-10 h-10 rounded-full bg-white border border-gray-200 flex items-center justify-center text-gray-400 mb-3 shadow-sm">
                  <Plus className="w-5 h-5" />
                </div>
                <h3 className="text-sm font-medium text-gray-900">Create New Item</h3>
                <p className="text-xs text-gray-500 mt-1">Add a new resource to this collection</p>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};