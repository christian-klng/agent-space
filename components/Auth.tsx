import React, { useState } from 'react';
import { supabase } from '../services/supabaseClient';
import { Loader2, ArrowRight } from 'lucide-react';

export const Auth: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      } else {
        const { error, data } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        
        // Handle email confirmation case
        if (data.user && !data.session) {
          setMessage("Account created successfully! Please check your email to confirm your account before logging in.");
          setLoading(false);
          return;
        }
        
        // Setup public user profile if signup successful and session exists
        if (data.user && data.session) {
          try {
            await supabase.from('users').upsert({
              id: data.user.id,
              email: data.user.email,
            });
          } catch (profileError) {
            console.warn('Error creating user profile:', profileError);
            // Don't block auth if profile creation fails (it might already exist or RLS might block it)
          }
        }
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md p-8 bg-white rounded-xl border border-gray-200 shadow-sm">
        <div className="mb-8 text-center">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900">
            {isLogin ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            Enter your credentials to access LinearAI
          </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors placeholder:text-gray-400"
              placeholder="name@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1.5 uppercase tracking-wide">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-400 transition-colors placeholder:text-gray-400"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-lg border border-red-100">
              {error}
            </div>
          )}
          
          {message && (
            <div className="p-3 text-sm text-green-600 bg-green-50 rounded-lg border border-green-100">
              {message}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white font-medium py-2.5 rounded-lg text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : (
              <>
                {isLogin ? 'Sign In' : 'Sign Up'} <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
              setMessage(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
          </button>
        </div>
      </div>
    </div>
  );
};