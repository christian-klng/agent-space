import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, Building2, ArrowRight } from 'lucide-react';

interface WorkspaceSetupProps {
  userId: string;
  userEmail: string;
  onComplete: () => void;
}

export const WorkspaceSetup: React.FC<WorkspaceSetupProps> = ({ userId, userEmail, onComplete }) => {
  const [workspaceName, setWorkspaceName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!workspaceName.trim()) {
      setError('Bitte gib einen Workspace-Namen ein.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // 1. Create the workspace
      const { data: workspace, error: workspaceError } = await supabase
        .from('workspaces')
        .insert({
          name: workspaceName.trim(),
          owner_id: userId,
        })
        .select()
        .single();

      if (workspaceError) throw workspaceError;

      // 2. Create user profile with workspace reference
      const { error: userError } = await supabase
        .from('users')
        .upsert({
          id: userId,
          email: userEmail,
          workspace_id: workspace.id,
        });

      if (userError) throw userError;

      onComplete();
    } catch (err: any) {
      console.error('Workspace creation error:', err);
      setError(err.message || 'Fehler beim Erstellen des Workspace.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-8 text-center">
          <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-6 h-6 text-gray-600" />
          </div>
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            Workspace erstellen
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Erstelle einen Workspace für dein Team. Du kannst später weitere Mitglieder einladen.
          </p>
        </div>

        <form onSubmit={handleCreateWorkspace} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Workspace Name
            </label>
            <input
              type="text"
              value={workspaceName}
              onChange={(e) => setWorkspaceName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors placeholder:text-gray-400"
              placeholder="z.B. Meine Firma"
              required
              autoFocus
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                Workspace erstellen <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <p className="mt-6 text-xs text-gray-400 text-center">
          Angemeldet als {userEmail}
        </p>
      </div>
    </div>
  );
};
