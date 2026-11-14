import React, { useState } from 'react';
import { Key, Lock, ArrowRight, Shield, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { setStoredApiKey, setAuthenticated } from '../lib/api';

interface LoginPageProps {
  onLoginSuccess: (apiKey: string) => void;
}

export function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [keyInput, setKeyInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const token = keyInput.trim() || 'dev-only-do-not-use-in-prod';
    setError(null);
    setVerifying(true);

    try {
      // Verify key against the gateway control plane
      const res = await fetch('/control/stats', {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          throw new Error('Invalid Gateway Key. Check your ADMIN_KEY or issued API key.');
        }
        throw new Error(`Gateway returned HTTP ${res.status}: ${res.statusText}`);
      }

      // Success
      setStoredApiKey(token);
      setAuthenticated(true, token);
      onLoginSuccess(token);
    } catch (err: any) {
      setError(err.message || 'Authentication failed');
    } finally {
      setVerifying(false);
    }
  };

  const handleQuickDemoLogin = () => {
    const demoKey = 'dev-only-do-not-use-in-prod';
    setKeyInput(demoKey);
    setStoredApiKey(demoKey);
    setAuthenticated(true, demoKey);
    onLoginSuccess(demoKey);
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-neutral-800 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-2 mb-1">
            <div className="w-7 h-7 bg-white text-black flex items-center justify-center font-bold text-xs tracking-wider">
              A2A
            </div>
            <span className="font-bold text-lg text-white tracking-tight">Gateway Console</span>
            <span className="text-[10px] text-slate-500 font-mono border border-neutral-800 px-1 py-0.2">v0.1</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">Sign in to your Gateway</h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            Enter your Gateway Bearer Key to manage routes, inspect agent timelines, and monitor triage streams.
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#080808] border border-neutral-800 p-6 shadow-2xl space-y-4">
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
              <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-slate-300 flex items-center justify-between">
                <span>Gateway Bearer Key</span>
                <span className="text-[11px] text-slate-500 font-mono">ADMIN_KEY</span>
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                  <Key size={14} />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="e.g. dev-only-do-not-use-in-prod"
                  value={keyInput}
                  onChange={(e) => setKeyInput(e.target.value)}
                  className="w-full pl-9 pr-10 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                  title={showPassword ? 'Hide Key' : 'Show Key'}
                >
                  {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="rounded bg-neutral-900 border-neutral-800 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
                />
                <span>Remember session</span>
              </label>
              <button
                type="button"
                onClick={handleQuickDemoLogin}
                className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
              >
                Use Local Dev Key ⚡
              </button>
            </div>

            <button
              type="submit"
              disabled={verifying}
              className="w-full py-2 px-4 bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {verifying ? (
                <span>Verifying with Gateway...</span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight size={13} />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Hint */}
          <div className="pt-3 border-t border-neutral-900 text-center">
            <p className="text-[11px] text-slate-500">
              Default development key:{' '}
              <code className="text-slate-400 font-mono bg-neutral-950 border border-neutral-800 px-1 py-0.5">
                dev-only-do-not-use-in-prod
              </code>
            </p>
          </div>
        </div>

        {/* Developer Customization Note */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>This login page is modular (<code className="text-slate-400 font-mono">dashboard/src/pages/Login.tsx</code>).</p>
          <p>Easily replaceable with Google OAuth, GitHub SSO, or your identity provider.</p>
        </div>
      </div>
    </div>
  );
}

