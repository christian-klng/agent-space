import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { AgentGrid } from './components/AgentGrid';
import { Chat } from './components/Chat';
import { SetupScreen } from './components/SetupScreen';
import { StyleGuide } from './components/StyleGuide';
import { Agent } from './types';
import { LogOut, User as UserIcon, LayoutTemplate, Home } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [view, setView] = useState<'home' | 'style-guide'>('home');

  // Check configuration status
  const hasSupabase = isSupabaseConfigured();

  useEffect(() => {
    if (!hasSupabase) return;

    // Check active session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, [hasSupabase]);

  if (!hasSupabase) {
    return <SetupScreen missingSupabase={!hasSupabase} missingGemini={false} />;
  }

  if (initializing) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
         <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  return (
    <div className="h-screen w-screen flex flex-col bg-white">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-6">
            <button 
                onClick={() => {
                    setView('home');
                    setSelectedAgent(null);
                }}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
            >
                <div className="w-6 h-6 bg-gray-900 rounded-md flex items-center justify-center text-white font-bold text-xs">L</div>
                <span className="font-medium text-sm tracking-tight">LinearAI</span>
            </button>
            
            <nav className="hidden md:flex items-center gap-1">
                <button
                    onClick={() => {
                        setView('home');
                        setSelectedAgent(null);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        view === 'home' 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    Home
                </button>
                <button
                    onClick={() => {
                        setView('style-guide');
                        setSelectedAgent(null);
                    }}
                    className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                        view === 'style-guide' 
                        ? 'bg-gray-100 text-gray-900' 
                        : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                    }`}
                >
                    Design System
                </button>
            </nav>
        </div>
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            <UserIcon className="w-3 h-3" />
            <span className="max-w-[150px] truncate">{session.user.email}</span>
          </div>
          <button 
            onClick={() => supabase.auth.signOut()}
            className="text-gray-400 hover:text-gray-900 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 overflow-hidden relative">
        {view === 'style-guide' ? (
            <div className="absolute inset-0 bg-white animate-in fade-in duration-200">
                <StyleGuide />
            </div>
        ) : selectedAgent ? (
          <div className="absolute inset-0 bg-white animate-in slide-in-from-right-4 duration-300">
            <Chat 
              agent={selectedAgent} 
              userId={session.user.id} 
              onBack={() => setSelectedAgent(null)} 
            />
          </div>
        ) : (
          <div className="h-full overflow-y-auto">
            <AgentGrid onSelectAgent={setSelectedAgent} />
          </div>
        )}
      </main>
    </div>
  );
};

export default App;