import React, { useState } from 'react';
import { User, Lock, Key, ArrowRight, Shield, Eye, EyeOff, CheckCircle2, AlertCircle, RefreshCw } from 'lucide-react';
import {
  loginDashboard,
  changeAdminPassword,
  getAdminUsername,
  isDefaultPassword,
} from '../lib/auth';
import { Logo } from '../components/Logo';

interface LoginPageProps {
  onLoginSuccess: () => void;
  initialMode?: 'login' | 'change_password';
}

export function LoginPage({ onLoginSuccess, initialMode = 'login' }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'change_password'>(initialMode);

  // Login form state
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Change password form state
  const [currentPass, setCurrentPass] = useState('admin');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [showNewPass, setShowNewPass] = useState(false);
  const [changeError, setChangeError] = useState<string | null>(null);
  const [changeSuccess, setChangeSuccess] = useState(false);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const res = loginDashboard(username, password);
    if (!res.success) {
      setError(res.error || 'Invalid credentials');
      return;
    }

    // If using the default password 'admin', navigate to change password page next
    if (res.requiresPasswordChange) {
      setCurrentPass(password);
      setMode('change_password');
    } else {
      onLoginSuccess();
    }
  };

  const handleChangePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setChangeError(null);

    if (newPass !== confirmPass) {
      setChangeError('New passwords do not match');
      return;
    }

    if (newPass === 'admin') {
      setChangeError('Please choose a password different from the default "admin"');
      return;
    }

    const res = changeAdminPassword(currentPass, newPass);
    if (!res.success) {
      setChangeError(res.error || 'Failed to update password');
      return;
    }

    setChangeSuccess(true);
    setTimeout(() => {
      onLoginSuccess();
    }, 1200);
  };

  const handleSkipChange = () => {
    onLoginSuccess();
  };

  return (
    <div className="min-h-screen bg-black text-slate-100 flex flex-col justify-center items-center px-4 py-12 selection:bg-neutral-800 selection:text-white">
      <div className="w-full max-w-md space-y-6">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center gap-3 mb-1">
            <Logo className="h-8 w-auto" />
            <span className="font-bold text-lg text-white tracking-tight">Vorax Console</span>
            <span className="text-[10px] text-slate-500 font-mono border border-neutral-800 px-1 py-0.2">v0.1</span>
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight">
            {mode === 'login' ? 'Sign in to Vorax' : 'Set New Administrator Password'}
          </h2>
          <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
            {mode === 'login'
              ? 'Enter your administrator credentials to access routes, agent cards, and task triage streams.'
              : 'Default password detected. Update your admin password to secure your gateway instance.'}
          </p>
        </div>

        {/* 1. Login View */}
        {mode === 'login' && (
          <div className="bg-[#080808] border border-neutral-800 p-6 shadow-2xl space-y-4">
            {error && (
              <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {/* Username Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Username
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <User size={14} />
                  </div>
                  <input
                    type="text"
                    required
                    placeholder="admin"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono transition-colors"
                  />
                </div>
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-slate-300">
                  Password
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-500">
                    <Lock size={14} />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="admin"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-10 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono transition-colors"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                    title={showPassword ? 'Hide Password' : 'Show Password'}
                  >
                    {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-0.5">
                <span className="text-[11px] text-slate-500">
                  Default credentials: <code className="text-slate-300 font-mono">admin / admin</code>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin');
                    setPassword('admin');
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                >
                  Fill Default ⚡
                </button>
              </div>

              <button
                type="submit"
                className="w-full py-2 px-4 bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2"
              >
                <span>Sign In</span>
                <ArrowRight size={13} />
              </button>
            </form>
          </div>
        )}

        {/* 2. Change Password View (Next Page) */}
        {mode === 'change_password' && (
          <div className="bg-[#080808] border border-neutral-800 p-6 shadow-2xl space-y-4">
            {changeSuccess ? (
              <div className="py-6 text-center space-y-3">
                <CheckCircle2 size={36} className="text-emerald-400 mx-auto" />
                <h3 className="text-sm font-bold text-white">Password Updated Successfully</h3>
                <p className="text-xs text-slate-400">Loading Vorax Console...</p>
              </div>
            ) : (
              <>
                {changeError && (
                  <div className="p-3 bg-rose-950/40 border border-rose-800/80 text-rose-300 text-xs flex items-start gap-2">
                    <AlertCircle size={14} className="text-rose-400 shrink-0 mt-0.5" />
                    <span>{changeError}</span>
                  </div>
                )}

                <form onSubmit={handleChangePasswordSubmit} className="space-y-4">
                  {/* Current Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Current Password
                    </label>
                    <input
                      type="password"
                      required
                      value={currentPass}
                      onChange={(e) => setCurrentPass(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono"
                    />
                  </div>

                  {/* New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      New Password
                    </label>
                    <div className="relative">
                      <input
                        type={showNewPass ? 'text' : 'password'}
                        required
                        placeholder="Choose a new password"
                        value={newPass}
                        onChange={(e) => setNewPass(e.target.value)}
                        className="w-full px-3 pr-10 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPass(!showNewPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-500 hover:text-slate-300"
                      >
                        {showNewPass ? <EyeOff size={14} /> : <Eye size={14} />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm New Password */}
                  <div className="space-y-1.5">
                    <label className="block text-xs font-medium text-slate-300">
                      Confirm New Password
                    </label>
                    <input
                      type="password"
                      required
                      placeholder="Repeat new password"
                      value={confirmPass}
                      onChange={(e) => setConfirmPass(e.target.value)}
                      className="w-full px-3 py-2 bg-black border border-neutral-800 text-xs text-white placeholder-slate-600 focus:outline-none focus:border-neutral-500 font-mono"
                    />
                  </div>

                  <div className="space-y-2 pt-2">
                    <button
                      type="submit"
                      className="w-full py-2 px-4 bg-white hover:bg-neutral-200 text-black text-xs font-bold transition-colors flex items-center justify-center gap-2"
                    >
                      <CheckCircle2 size={13} />
                      <span>Save New Password & Continue</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSkipChange}
                      className="w-full py-2 px-4 bg-transparent hover:bg-neutral-900 text-slate-400 hover:text-white text-xs transition-colors border border-neutral-800"
                    >
                      Skip for Now (Keep Default)
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        )}

        {/* Footer Note */}
        <div className="text-center text-[11px] text-slate-500 space-y-1">
          <p>Credentials can be modified anytime in <code className="text-slate-400 font-mono">dashboard/src/lib/auth.ts</code></p>
        </div>
      </div>
    </div>
  );
}
