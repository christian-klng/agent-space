import React from 'react';
import { AlertTriangle, Database } from 'lucide-react';

interface SetupScreenProps {
  missingSupabase: boolean;
  missingGemini: boolean; // Kept for prop compatibility but unused
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ missingSupabase }) => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-lg w-full bg-white border border-gray-200 rounded-xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-3 bg-red-50 rounded-lg">
            <AlertTriangle className="w-6 h-6 text-red-600" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Configuration Required</h1>
        </div>
        
        <p className="text-gray-600 mb-6 text-sm leading-relaxed">
          To run this application, you need to connect your Supabase project. 
          Please set the following environment variables in your runtime environment.
        </p>

        <div className="space-y-4">
          {missingSupabase && (
            <div className="p-4 border border-red-100 bg-red-50/50 rounded-lg">
              <div className="flex items-center gap-2 mb-2 text-red-700 font-medium text-sm">
                <Database className="w-4 h-4" />
                <span>Supabase Connection</span>
              </div>
              <ul className="list-disc list-inside text-xs text-gray-600 space-y-1 ml-1">
                <li><code className="bg-white px-1 py-0.5 border border-red-100 rounded text-red-600">SUPABASE_URL</code></li>
                <li><code className="bg-white px-1 py-0.5 border border-red-100 rounded text-red-600">SUPABASE_ANON_KEY</code></li>
              </ul>
            </div>
          )}
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100 text-center">
          <p className="text-xs text-gray-400">
            Check the console for more details or restart the application after setting variables.
          </p>
        </div>
      </div>
    </div>
  );
};