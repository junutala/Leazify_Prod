'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { Eye, EyeOff, Copy, Check, Loader2, Building2, Lock, ArrowLeft, Mail } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface LoginValues {
  email: string;
  password: string;
}

interface DemoCredential {
  id: string;
  role: string;
  email: string;
  password: string;
  color: string;
}

const demoCredentials: DemoCredential[] = [
  { id: 'cred-superadmin', role: 'Super Admin', email: 'junutala@gmail.com', password: 'Arun@2026', color: 'bg-primary/10 text-primary' },
  { id: 'cred-admin', role: 'Admin', email: 'admin@propflow.io', password: 'Admin@1234', color: 'bg-blue-50 text-blue-600' },
  { id: 'cred-manager', role: 'Property Manager', email: 'manager@propflow.io', password: 'Manager@1234', color: 'bg-indigo-50 text-indigo-600' },
  { id: 'cred-finance', role: 'Finance', email: 'finance@propflow.io', password: 'Finance@1234', color: 'bg-emerald-50 text-emerald-600' },
  { id: 'cred-landlord', role: 'Landlord', email: 'landlord@propflow.io', password: 'Landlord@1234', color: 'bg-violet-50 text-violet-600' },
  { id: 'cred-tenant', role: 'Tenant', email: 'tenant@propflow.io', password: 'Tenant@1234', color: 'bg-amber-50 text-amber-600' },
  { id: 'cred-provider', role: 'Service Provider', email: 'provider@propflow.io', password: 'Provider@1234', color: 'bg-orange-50 text-orange-600' },
];

interface LoginFormProps {
  onSwitchToSignup: () => void;
}

export default function LoginForm({ onSwitchToSignup }: LoginFormProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [view, setView] = useState<'login' | 'forgot'>('login');
  const [forgotEmail, setForgotEmail] = useState('');
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);
  const router = useRouter();
  const { signIn } = useAuth();
  const { t, language, setLanguage } = useLanguage();

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<LoginValues>({ defaultValues: { email: '', password: '' } });

  const onSubmit = async (data: LoginValues) => {
    setLoading(true);
    try {
      const authData = await signIn(data.email, data.password);
      if (!authData.session) {
        toast.error('Login failed — no session returned. Please try again.');
        setLoading(false);
        return;
      }
      toast.success('Signed in successfully');
      const userEmail = authData.user?.email || '';
      const userRole = authData.user?.user_metadata?.role || '';
      if (userEmail === 'tenant@propflow.io') {
        router.push('/tenant-portal');
      } else if (userEmail === 'provider@propflow.io') {
        router.push('/service-provider-portal');
      } else if (userRole === 'landlord') {
        router.push('/landlord-dashboard');
      } else {
        try {
          const { createClient } = await import('@/lib/supabase/client');
          const supabase = createClient();
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('role')
            .eq('id', authData.user?.id)
            .maybeSingle();
          if (profile?.role === 'landlord') {
            router.push('/landlord-dashboard');
          } else {
            router.push('/dashboard');
          }
        } catch {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      toast.error(err.message || 'Invalid credentials. Please check your email and password.');
      setLoading(false);
    }
  };

  const autofill = (cred: DemoCredential) => {
    setValue('email', cred.email);
    setValue('password', cred.password);
    toast.info(`${cred.role} credentials loaded`);
  };

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopiedField(key);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(forgotEmail)) {
      toast.error('Please enter a valid email address');
      return;
    }
    setForgotLoading(true);
    try {
      const res = await fetch('/api/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error || 'Failed to send reset email');
      } else {
        setForgotSent(true);
      }
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setForgotLoading(false);
    }
  };

  // ── Forgot Password View ──
  if (view === 'forgot') {
    return (
      <div className="space-y-5 animate-fade-in">
        <div className="text-center pb-1">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-3">
            <Mail size={22} className="text-primary" />
          </div>
          <h2 className="text-[22px] font-800 text-foreground mb-1">
            {forgotSent ? 'Check your email' : 'Forgot password?'}
          </h2>
          <p className="text-[13px] text-muted-foreground">
            {forgotSent
              ? `We've sent a password reset link to ${forgotEmail}`
              : 'Enter your email and we\'ll send you a reset link'}
          </p>
        </div>

        {!forgotSent ? (
          <form onSubmit={handleForgotPassword} className="space-y-4">
            <div className="space-y-1.5">
              <label className="block text-[12px] font-600 text-foreground">Email address</label>
              <input
                type="email"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                placeholder="you@company.com"
                className="w-full px-4 py-3 text-[14px] bg-secondary/40 border border-border rounded-xl outline-none transition-all duration-150 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15"
                autoFocus
              />
            </div>
            <button
              type="submit"
              disabled={forgotLoading}
              className="w-full py-3 bg-primary text-white text-[14px] font-600 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {forgotLoading ? (
                <><Loader2 size={16} className="animate-spin" /><span>Sending...</span></>
              ) : (
                <span>Send Reset Link</span>
              )}
            </button>
          </form>
        ) : (
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
            <p className="text-[13px] text-emerald-700">
              If an account exists for <strong>{forgotEmail}</strong>, you will receive a password reset email shortly.
            </p>
          </div>
        )}

        <button
          type="button"
          onClick={() => { setView('login'); setForgotSent(false); setForgotEmail(''); }}
          className="w-full flex items-center justify-center gap-1.5 text-[13px] text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft size={14} />
          Back to sign in
        </button>

        {/* Language switcher */}
        <div className="flex items-center justify-center pt-1">
          <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-3 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'en' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('ar')}
              className={`px-3 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'ar' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
            >
              عر
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Login View ──
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 animate-fade-in">
      {/* Header */}
      <div className="text-center pb-1">
        <div className="w-12 h-12 rounded-2xl bg-primary flex items-center justify-center mx-auto mb-3">
          <Building2 size={22} className="text-white" />
        </div>
        <h2 className="text-[22px] font-800 text-foreground mb-1">Welcome back</h2>
        <p className="text-[13px] text-muted-foreground">Sign in to your Leazify workspace</p>
      </div>

      {/* Language switcher — visible on all screen sizes */}
      <div className="flex items-center justify-center">
        <div className="flex items-center gap-1 bg-secondary/60 rounded-lg p-0.5">
          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`px-3 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'en' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            EN
          </button>
          <button
            type="button"
            onClick={() => setLanguage('ar')}
            className={`px-3 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'ar' ? 'bg-white text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
          >
            عر
          </button>
        </div>
      </div>

      {/* Email */}
      <div className="space-y-1.5">
        <label className="block text-[12px] font-600 text-foreground">Email address</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={`w-full px-4 py-3 text-[14px] bg-secondary/40 border rounded-xl outline-none transition-all duration-150 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 ${
            errors.email ? 'border-destructive bg-destructive/5' : 'border-border'
          }`}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />
        {errors.email && <p className="text-[11px] text-destructive flex items-center gap-1">{errors.email.message}</p>}
      </div>

      {/* Password */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="block text-[12px] font-600 text-foreground">Password</label>
          <button
            type="button"
            onClick={() => setView('forgot')}
            className="text-[11px] text-primary hover:underline font-500"
          >
            Forgot password?
          </button>
        </div>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            autoComplete="current-password"
            placeholder="••••••••"
            className={`w-full px-4 py-3 pr-11 text-[14px] bg-secondary/40 border rounded-xl outline-none transition-all duration-150 focus:bg-white focus:border-primary focus:ring-2 focus:ring-primary/15 ${
              errors.password ? 'border-destructive bg-destructive/5' : 'border-border'
            }`}
            {...register('password', { required: 'Password is required', minLength: { value: 6, message: 'Minimum 6 characters' } })}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-0.5"
            aria-label={showPwd ? 'Hide password' : 'Show password'}
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {errors.password && <p className="text-[11px] text-destructive">{errors.password.message}</p>}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-primary text-white text-[14px] font-600 rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {loading ? (
          <><Loader2 size={16} className="animate-spin" /><span>Signing in...</span></>
        ) : (
          <><Lock size={15} /><span>Sign In</span></>
        )}
      </button>

      <p className="text-center text-[12px] text-muted-foreground">
        No account yet?{' '}
        <button type="button" onClick={onSwitchToSignup} className="text-primary font-600 hover:underline">
          Create one free
        </button>
      </p>

      {/* Demo credentials */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="bg-secondary/60 px-4 py-2.5 border-b border-border flex items-center justify-between">
          <p className="text-[10px] font-700 text-muted-foreground uppercase tracking-wider">Demo Accounts</p>
          <p className="text-[10px] text-muted-foreground">Click &quot;Use&quot; to autofill</p>
        </div>
        <div className="divide-y divide-border">
          {demoCredentials.map((cred) => (
            <div key={cred.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-secondary/30 transition-colors">
              <div className="min-w-0 flex-1 flex items-center gap-2.5">
                <span className={`text-[10px] font-700 px-2 py-0.5 rounded-full shrink-0 ${cred.color}`}>{cred.role}</span>
                <p className="text-[11px] text-muted-foreground font-mono truncate">{cred.email}</p>
              </div>
              <div className="flex items-center gap-1.5 ml-3 shrink-0">
                <button
                  type="button"
                  onClick={() => copyToClipboard(cred.password, `${cred.id}-pwd`)}
                  className="p-1.5 rounded-md hover:bg-border transition-colors text-muted-foreground hover:text-foreground"
                  title="Copy password"
                >
                  {copiedField === `${cred.id}-pwd` ? <Check size={12} className="text-success" /> : <Copy size={12} />}
                </button>
                <button
                  type="button"
                  onClick={() => autofill(cred)}
                  className="px-2.5 py-1 bg-primary/10 text-primary text-[11px] font-600 rounded-lg hover:bg-primary/15 transition-colors"
                >
                  Use
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </form>
  );
}