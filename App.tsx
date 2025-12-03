import React, { useEffect, useState } from 'react';
import { Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from './services/supabaseClient';
import { Auth } from './components/Auth';
import { AgentGrid } from './components/AgentGrid';
import { Chat } from './components/Chat';
import { SetupScreen } from './components/SetupScreen';
import { StyleGuide } from './components/StyleGuide';
import { WorkspaceSetup } from './components/WorkspaceSetup';
import { Agent, UserProfile } from './types';
import { LogOut, User as UserIcon, Menu, X } from 'lucide-react';

const App: React.FC = () => {
  const [session, setSession] = useState<Session | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [checkingWorkspace, setCheckingWorkspace] = useState(false);
  const [view, setView] = useState<'home' | 'style-guide'>('home');
  
  // Mobile Menu State
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const hasSupabase = isSupabaseConfigured();

  const fetchUserProfile = async (userId: string) => {
    setCheckingWorkspace(true);
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user profile:', error);
      }
      
      setUserProfile(data || null);
    } catch (err) {
      console.error('Error:', err);
      setUserProfile(null);
    } finally {
      setCheckingWorkspace(false);
    }
  };

  useEffect(() => {
    if (!hasSupabase) return;

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      }
      setInitializing(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      if (session?.user) {
        fetchUserProfile(session.user.id);
      } else {
        setUserProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, [hasSupabase]);

  const handleWorkspaceCreated = () => {
    if (session?.user) {
      fetchUserProfile(session.user.id);
    }
  };

  // Navigation Handler mit Mobile Menu schließen
  const handleNavigation = (newView: 'home' | 'style-guide') => {
    setView(newView);
    setSelectedAgent(null);
    setMobileMenuOpen(false);
  };

  if (!hasSupabase) {
    return <SetupScreen missingSupabase={!hasSupabase} missingGemini={false} />;
  }

  if (initializing || checkingWorkspace) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-white">
        <div className="w-6 h-6 border-2 border-gray-200 border-t-gray-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!session) {
    return <Auth />;
  }

  if (!userProfile?.workspace_id) {
    return (
      <WorkspaceSetup
        userId={session.user.id}
        userEmail={session.user.email || ''}
        onComplete={handleWorkspaceCreated}
      />
    );
  }

  return (
    <div className="h-full w-full flex flex-col bg-white">
      {/* Top Navigation Bar */}
      <header className="h-14 border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 flex-shrink-0 bg-white z-20">
        <div className="flex items-center gap-4 sm:gap-6">
          {/* Logo */}
          <button
            onClick={() => handleNavigation('home')}
            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
          >
            <img src="/logo.png" alt="Logo" className="w-6 h-6 object-contain" />
            <span className="font-medium text-sm tracking-tight">Human in the Loop</span>
          </button>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              onClick={() => handleNavigation('home')}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                view === 'home'
                  ? 'bg-gray-100 text-gray-900'
                  : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
              }`}
            >
              Home
            </button>
            <button
              onClick={() => handleNavigation('style-guide')}
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

        <div className="flex items-center gap-2 sm:gap-4">
          {/* User Info - nur auf Desktop */}
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-md border border-gray-100">
            {userProfile?.avatar_url ? (
              <img 
                src={userProfile.avatar_url} 
                alt="Avatar" 
                className="w-5 h-5 rounded-full object-cover"
              />
            ) : (
              <UserIcon className="w-3 h-3" />
            )}
            <span className="max-w-[150px] truncate">{userProfile?.full_name || session.user.email}</span>
          </div>

          {/* Logout Button - nur auf Desktop */}
          <button
            onClick={() => supabase.auth.signOut()}
            className="hidden md:block text-gray-400 hover:text-gray-900 transition-colors"
            title="Abmelden"
          >
            <LogOut className="w-4 h-4" />
          </button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-1.5 text-gray-500 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-gray-200 bg-white px-4 py-2 space-y-1">
          <button
            onClick={() => handleNavigation('home')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'home'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Home
          </button>
          <button
            onClick={() => handleNavigation('style-guide')}
            className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
              view === 'style-guide'
                ? 'bg-gray-100 text-gray-900'
                : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
            }`}
          >
            Design System
          </button>
          {/* User Info und Logout im Mobile Menü */}
          <div className="border-t border-gray-100 mt-2 pt-2 px-3 py-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {userProfile?.avatar_url ? (
                  <img 
                    src={userProfile.avatar_url} 
                    alt="Avatar" 
                    className="w-7 h-7 rounded-full object-cover border border-gray-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-gray-100 flex items-center justify-center">
                    <UserIcon className="w-4 h-4 text-gray-500" />
                  </div>
                )}
                <span className="text-xs text-gray-500 truncate max-w-[180px]">
                  {userProfile?.full_name || session.user.email}
                </span>
              </div>
              <button
                onClick={() => supabase.auth.signOut()}
                className="p-2 text-gray-400 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                title="Abmelden"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

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
              workspaceId={userProfile.workspace_id}
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
