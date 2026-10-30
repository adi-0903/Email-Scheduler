import React, { useState } from 'react';
import {
  Mail,
  Eye,
  EyeOff,
  Lock,
  User,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  TrendingUp,
  Zap,
  X,
  ExternalLink,
} from 'lucide-react';

interface LoginScreenProps {
  onLogin: (userData?: { name: string; email: string }) => void;
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin }) => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [errors, setErrors] = useState<{ name?: string; email?: string; password?: string }>({});
  const [isLoading, setIsLoading] = useState(false);

  // Google Auth Dialog State
  const [isGoogleModalOpen, setIsGoogleModalOpen] = useState(false);
  const [useAnotherGoogleAccount, setUseAnotherGoogleAccount] = useState(false);
  const [customGoogleName, setCustomGoogleName] = useState('');
  const [customGoogleEmail, setCustomGoogleEmail] = useState('');
  const [googleError, setGoogleError] = useState('');

  const handleToggleMode = (newMode: 'login' | 'signup') => {
    setMode(newMode);
    setErrors({});
  };

  // Google Authentication Trigger
  const handleGoogleAuth = () => {
    const googleClientId =
      (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_GOOGLE_CLIENT_ID) || '';

    // If a Google Client ID is configured and Google SDK is present, trigger official Google OAuth 2.0
    if (googleClientId && typeof window !== 'undefined' && (window as any).google?.accounts?.oauth2) {
      try {
        setIsLoading(true);
        const tokenClient = (window as any).google.accounts.oauth2.initTokenClient({
          client_id: googleClientId,
          scope: 'https://www.googleapis.com/auth/userinfo.email https://www.googleapis.com/auth/userinfo.profile',
          callback: async (resp: any) => {
            if (resp.error) {
              console.warn('[Google Auth] OAuth cancelled or error:', resp);
              setIsLoading(false);
              return;
            }
            try {
              const res = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${resp.access_token}` },
              });
              const info = await res.json();
              setIsLoading(false);
              onLogin({
                name: info.name || info.email.split('@')[0],
                email: info.email,
              });
            } catch (fetchErr) {
              console.error('[Google Auth] Failed to fetch profile:', fetchErr);
              setIsLoading(false);
            }
          },
        });
        tokenClient.requestAccessToken();
        return;
      } catch (err) {
        console.warn('[Google Auth] Falling back to account selector dialog:', err);
      }
    }

    // Default: Open the Google Account Selector dialog
    setIsGoogleModalOpen(true);
  };

  const handleSelectGoogleAccount = (accName: string, accEmail: string) => {
    setIsLoading(true);
    setIsGoogleModalOpen(false);
    setTimeout(() => {
      setIsLoading(false);
      onLogin({
        name: accName,
        email: accEmail,
      });
    }, 400);
  };

  const handleCustomGoogleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customGoogleEmail.trim()) {
      setGoogleError('Please enter your Google email address');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customGoogleEmail)) {
      setGoogleError('Please enter a valid email address');
      return;
    }

    const resolvedName =
      customGoogleName.trim() ||
      customGoogleEmail.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

    handleSelectGoogleAccount(resolvedName, customGoogleEmail.trim());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: { name?: string; email?: string; password?: string } = {};

    if (mode === 'signup' && !name.trim()) {
      newErrors.name = 'Full name is required';
    }

    if (!email.trim()) {
      newErrors.email = 'Work email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    if (!password) {
      newErrors.password = 'Password is required';
    } else if (mode === 'signup' && password.length < 8) {
      newErrors.password = 'Must be at least 8 characters';
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setTimeout(() => {
      setIsLoading(false);
      const displayName =
        name.trim() ||
        (email.split('@')[0]
          ? email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
          : 'User');
      onLogin({
        name: displayName,
        email: email.trim(),
      });
    }, 450);
  };

  const handlePrefillDemo = () => {
    setName('Aditya Singhal');
    setEmail('singhaladitya611@gmail.com');
    setPassword('reachinbox2026!');
    setErrors({});
  };

  return (
    <div className="min-h-screen bg-[#0F172A] flex items-center justify-center p-4 sm:p-6 lg:p-12 relative overflow-hidden select-none">
      {/* Background radial blurs */}
      <div className="absolute top-0 right-1/4 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-0 left-1/4 w-[500px] h-[500px] bg-indigo-600/15 rounded-full blur-[100px] pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl border border-slate-200/80 overflow-hidden flex flex-col lg:flex-row relative z-10">
        {/* Left Side: Brand Story & Social Proof */}
        <div className="lg:w-1/2 bg-gradient-to-br from-slate-900 via-slate-900 to-indigo-950 p-8 sm:p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:20px_20px] opacity-25 pointer-events-none" />

          {/* Top Brand */}
          <div className="relative z-10">
            <div className="flex items-center gap-2.5 mb-8">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/30">
                <Mail className="w-5 h-5 stroke-[2.2]" />
              </div>
              <div className="flex items-baseline">
                <span className="text-2xl font-bold tracking-tight text-white">Reach</span>
                <span className="text-2xl font-semibold tracking-tight text-blue-400">Inbox</span>
              </div>
            </div>

            <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white leading-tight mb-4">
              Scale cold email outbound without burning your domains.
            </h2>
            <p className="text-sm text-slate-300 leading-relaxed max-w-md">
              ReachInbox gives B2B revenue teams automated rate pacing, native deliverability guards, and Slack alerting for hot leads.
            </p>

            {/* Feature Highlights */}
            <div className="mt-8 space-y-3.5">
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <span>99.4% inbox placement rate with automated warmup guards</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4" />
                </div>
                <span>Intelligent BullMQ pacing (spaced safely per sender)</span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-200">
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <span>Real-time Slack triggers and rate-limit breach alerts</span>
              </div>
            </div>
          </div>

          {/* Bottom Social Proof Quote */}
          <div className="mt-12 pt-6 border-t border-slate-800/80 relative z-10">
            <p className="text-xs text-slate-300 italic leading-relaxed">
              "We scaled our personalized emails with zero domain burns and a 99.4% inbox delivery rate."
            </p>
            <div className="flex items-center gap-3 mt-4">
              <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-400 to-indigo-500 text-white font-bold text-xs flex items-center justify-center">
                AS
              </div>
              <div>
                <p className="text-xs font-bold text-white">Aditya Singhal</p>
                <p className="text-[11px] text-slate-400">Head of Outbound Engineering</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Side: Form Card */}
        <div className="lg:w-1/2 p-8 sm:p-12 flex flex-col justify-center bg-white">
          <div className="max-w-md w-full mx-auto">
            {/* Mode Toggle */}
            <div className="bg-slate-100 p-1 rounded-xl flex items-center mb-6">
              <button
                type="button"
                onClick={() => handleToggleMode('login')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'login'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => handleToggleMode('signup')}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all text-center cursor-pointer ${
                  mode === 'signup'
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                Create account
              </button>
            </div>

            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                {mode === 'login' ? 'Welcome to ReachInbox' : 'Start your outbound engine'}
              </h1>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                {mode === 'login'
                  ? 'Sign in to access your scheduled outbound queue and metrics.'
                  : 'Get started in 30 seconds. No credit card required.'}
              </p>
            </div>

            {/* Google Authentication Button */}
            <button
              type="button"
              onClick={handleGoogleAuth}
              disabled={isLoading}
              className="w-full py-2.5 px-4 bg-white hover:bg-slate-50 active:bg-slate-100 border border-slate-300 rounded-xl shadow-2xs text-xs sm:text-sm font-semibold text-slate-700 flex items-center justify-center gap-3 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 mb-5 cursor-pointer"
            >
              <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24" aria-hidden="true">
                <path
                  fill="#4285F4"
                  d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                />
                <path
                  fill="#34A853"
                  d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                />
                <path
                  fill="#EA4335"
                  d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                />
              </svg>
              <span>{mode === 'login' ? 'Continue with Google' : 'Sign up with Google'}</span>
            </button>

            {/* Divider */}
            <div className="relative flex items-center justify-center mb-5">
              <div className="border-t border-slate-200 w-full" />
              <span className="bg-white px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider absolute">
                or continue with email
              </span>
            </div>

            {/* Email / Password Form */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Full Name (Sign Up only) */}
              {mode === 'signup' && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full name
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => {
                        setName(e.target.value);
                        if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                      }}
                      placeholder="Aditya Singhal"
                      className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white rounded-xl border transition-all text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                        errors.name
                          ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                          : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                      }`}
                    />
                  </div>
                  {errors.name && <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.name}</p>}
                </div>
              )}

              {/* Work Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Work email
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
                    }}
                    placeholder="singhaladitya611@gmail.com"
                    className={`w-full pl-10 pr-4 py-2.5 text-xs sm:text-sm bg-white rounded-xl border transition-all text-slate-800 placeholder:text-slate-400 focus:outline-none ${
                      errors.email
                        ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                </div>
                {errors.email && <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.email}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Password
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
                    }}
                    placeholder="••••••••"
                    className={`w-full pl-10 pr-10 py-2.5 text-xs sm:text-sm bg-white rounded-xl border transition-all text-slate-800 focus:outline-none ${
                      errors.password
                        ? 'border-red-500 focus:ring-2 focus:ring-red-100'
                        : 'border-slate-300 focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20'
                    }`}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password ? (
                  <p className="text-[11px] text-red-600 mt-1 font-medium">{errors.password}</p>
                ) : mode === 'signup' ? (
                  <p className="text-[11px] text-slate-400 mt-1">Must be at least 8 characters</p>
                ) : null}
              </div>

              {/* Remember Me & Demo Helper */}
              {mode === 'login' && (
                <div className="flex items-center justify-between text-xs pt-0.5">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300"
                    />
                    <span>Remember me for 30 days</span>
                  </label>

                  <button
                    type="button"
                    onClick={handlePrefillDemo}
                    className="text-[11px] text-blue-600 hover:underline font-semibold cursor-pointer"
                  >
                    Prefill demo
                  </button>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:from-blue-800 active:to-indigo-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-md shadow-blue-500/20 flex items-center justify-center gap-2 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 cursor-pointer"
              >
                <span>{mode === 'login' ? 'Log in to ReachInbox' : 'Create free account'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>

            {/* Switch mode footer */}
            <div className="mt-6 pt-5 border-t border-slate-100 text-center text-xs text-slate-500">
              {mode === 'login' ? (
                <p>
                  Don't have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleToggleMode('signup')}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Create account
                  </button>
                </p>
              ) : (
                <p>
                  Already have an account?{' '}
                  <button
                    type="button"
                    onClick={() => handleToggleMode('login')}
                    className="font-bold text-blue-600 hover:text-blue-700 hover:underline cursor-pointer"
                  >
                    Log in
                  </button>
                </p>
              )}
            </div>

            {/* Terms & Privacy */}
            <p className="text-[11px] text-slate-400 text-center mt-5 leading-normal">
              By continuing, you agree to ReachInbox's Terms of Service and Privacy Policy.
            </p>
          </div>
        </div>
      </div>

      {/* Google Authentication Account Picker Dialog */}
      {isGoogleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-sm w-full overflow-hidden animate-in zoom-in-95 duration-150">
            {/* Header */}
            <div className="p-6 border-b border-slate-100 text-center relative">
              <button
                type="button"
                onClick={() => {
                  setIsGoogleModalOpen(false);
                  setGoogleError('');
                }}
                className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-10 h-10 rounded-full bg-slate-50 border border-slate-200/80 flex items-center justify-center mx-auto mb-3 shadow-2xs">
                <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    fill="#4285F4"
                    d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.33 24 12 24z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.18 0 9.99 0 12s.45 3.82 1.25 5.42l4.03-3.15z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                  />
                </svg>
              </div>

              <h2 className="text-base font-bold text-slate-900">Sign in with Google</h2>
              <p className="text-xs text-slate-500 mt-1">Choose an account to continue to ReachInbox</p>
            </div>

            {/* Content: Account list or Custom form */}
            <div className="p-4 space-y-2">
              {!useAnotherGoogleAccount ? (
                <>
                  {/* Account 1: Aditya Singhal */}
                  <button
                    type="button"
                    onClick={() => handleSelectGoogleAccount('Aditya Singhal', 'singhaladitya611@gmail.com')}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 hover:border-blue-200 transition-all text-left group cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                      AS
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-slate-800 group-hover:text-blue-600 truncate">
                        Aditya Singhal
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">singhaladitya611@gmail.com</p>
                    </div>
                    <span className="text-[10px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                      Primary
                    </span>
                  </button>

                  {/* Account 2: Use another Google account */}
                  <button
                    type="button"
                    onClick={() => setUseAnotherGoogleAccount(true)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 border border-slate-100 transition-all text-left cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                      <User className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-slate-700">Use another Google account</p>
                      <p className="text-[10px] text-slate-400">Enter custom name & gmail</p>
                    </div>
                  </button>
                </>
              ) : (
                /* Custom Google Account Form */
                <form onSubmit={handleCustomGoogleSubmit} className="space-y-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Your Full Name
                    </label>
                    <input
                      type="text"
                      value={customGoogleName}
                      onChange={(e) => setCustomGoogleName(e.target.value)}
                      placeholder="e.g. Aditya Singhal"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Google Email Address
                    </label>
                    <input
                      type="email"
                      value={customGoogleEmail}
                      onChange={(e) => {
                        setCustomGoogleEmail(e.target.value);
                        setGoogleError('');
                      }}
                      placeholder="you@gmail.com"
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:border-blue-600"
                      autoFocus
                    />
                  </div>

                  {googleError && (
                    <p className="text-[11px] text-red-600 font-medium">{googleError}</p>
                  )}

                  <div className="flex items-center gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setUseAnotherGoogleAccount(false)}
                      className="flex-1 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                    >
                      Back
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors shadow-sm"
                    >
                      Sign In with Google
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer */}
            <div className="p-3.5 bg-slate-50/80 border-t border-slate-100 text-center">
              <p className="text-[10px] text-slate-400 leading-tight">
                To enable the official Google Cloud OAuth consent popup, configure{' '}
                <code className="text-slate-600 font-mono">VITE_GOOGLE_CLIENT_ID</code>.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
