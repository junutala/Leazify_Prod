'use client';

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { Eye, EyeOff, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

interface SignupValues {
  fullName: string;
  email: string;
  company: string;
  role: string;
  password: string;
  confirmPassword: string;
  terms: boolean;
}

interface SignupFormProps {
  onSwitchToLogin: () => void;
}

const roles = ['Property Manager', 'Asset Manager', 'Finance Director', 'Leasing Manager', 'Facilities Manager', 'Other'];

function getPasswordStrength(pwd: string): { score: number; label: string; color: string } {
  if (!pwd) return { score: 0, label: '', color: '' };
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;
  const map = [
    { label: '', color: '' },
    { label: 'Weak', color: 'bg-destructive' },
    { label: 'Fair', color: 'bg-amber-400' },
    { label: 'Good', color: 'bg-yellow-400' },
    { label: 'Strong', color: 'bg-success' },
  ];
  return { score, ...map[score] };
}

export default function SignupForm({ onSwitchToLogin }: SignupFormProps) {
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<SignupValues>();

  const pwd = watch('password', '');
  const strength = getPasswordStrength(pwd);

  const onSubmit = async (data: SignupValues) => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email: data.email,
        password: data.password,
        options: {
          data: {
            full_name: data.fullName,
            company: data.company,
            role: data.role,
          },
          emailRedirectTo: `${window.location.origin}/dashboard`,
        },
      });

      if (error) {
        toast.error(error.message || 'Failed to create account. Please try again.');
        setLoading(false);
        return;
      }

      toast.success('Account created! Check your email to verify, then sign in.');
      onSwitchToLogin();
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-[22px] font-700 text-foreground mb-1">Create your account</h2>
        <p className="text-[13px] text-muted-foreground">Start managing your portfolio in minutes</p>
      </div>

      {/* Full name */}
      <div>
        <label className="block text-[13px] font-500 text-foreground mb-1.5">Full name</label>
        <input
          type="text"
          autoComplete="name"
          placeholder="Alex Morgan"
          className={`w-full px-3.5 py-2.5 text-[14px] bg-white border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 ${errors.fullName ? 'border-destructive' : 'border-border'}`}
          {...register('fullName', { required: 'Full name is required' })}
        />
        {errors.fullName && <p className="mt-1 text-[12px] text-destructive">{errors.fullName.message}</p>}
      </div>

      {/* Email */}
      <div>
        <label className="block text-[13px] font-500 text-foreground mb-1.5">Work email</label>
        <input
          type="email"
          autoComplete="email"
          placeholder="you@company.com"
          className={`w-full px-3.5 py-2.5 text-[14px] bg-white border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 ${errors.email ? 'border-destructive' : 'border-border'}`}
          {...register('email', {
            required: 'Email is required',
            pattern: { value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/, message: 'Enter a valid email' },
          })}
        />
        {errors.email && <p className="mt-1 text-[12px] text-destructive">{errors.email.message}</p>}
      </div>

      {/* Company + Role row */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-[13px] font-500 text-foreground mb-1.5">Company name</label>
          <input
            type="text"
            placeholder="Acme Properties"
            className={`w-full px-3.5 py-2.5 text-[14px] bg-white border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 ${errors.company ? 'border-destructive' : 'border-border'}`}
            {...register('company', { required: 'Required' })}
          />
          {errors.company && <p className="mt-1 text-[12px] text-destructive">{errors.company.message}</p>}
        </div>
        <div>
          <label className="block text-[13px] font-500 text-foreground mb-1.5">Your role</label>
          <select
            className={`w-full px-3.5 py-2.5 text-[14px] bg-white border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 ${errors.role ? 'border-destructive' : 'border-border'}`}
            {...register('role', { required: 'Required' })}
          >
            <option value="">Select role</option>
            {roles.map((r) => (
              <option key={`role-${r}`} value={r}>{r}</option>
            ))}
          </select>
          {errors.role && <p className="mt-1 text-[12px] text-destructive">{errors.role.message}</p>}
        </div>
      </div>

      {/* Password */}
      <div>
        <label className="block text-[13px] font-500 text-foreground mb-1.5">Password</label>
        <div className="relative">
          <input
            type={showPwd ? 'text' : 'password'}
            autoComplete="new-password"
            placeholder="Min. 8 characters"
            className={`w-full px-3.5 py-2.5 pr-10 text-[14px] bg-white border rounded-lg outline-none transition-all duration-150 focus:border-primary focus:ring-2 focus:ring-primary/15 ${errors.password ? 'border-destructive' : 'border-border'}`}
            {...register('password', {
              required: 'Password is required',
              minLength: { value: 8, message: 'Minimum 8 characters' },
            })}
          />
          <button
            type="button"
            onClick={() => setShowPwd(!showPwd)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>
        {pwd && (
          <div className="mt-2">
            <div className="flex gap-1 mb-1">
              {[1, 2, 3, 4].map((i) => (
                <div
                  key={`strength-${i}`}
                  className={`h-1 flex-1 rounded-full transition-all duration-300 ${i <= strength.score ? strength.color : 'bg-border'}`}
                />
              ))}
            </div>
            {strength.label && <p className={`text-[11px] font-500 ${strength.score <= 1 ? 'text-destructive' : strength.score === 2 ? 'text-amber-500' : 'text-success'}`}>{strength.label} password</p>}
          </div>
        )}
        {errors.password && <p className="mt-1 text-[12px] text-destructive">{errors.password.message}</p>}
      </div>

      {/* Terms */}
      <div className="flex items-start gap-2.5">
        <input
          id="terms"
          type="checkbox"
          className="w-4 h-4 mt-0.5 rounded border-border accent-primary"
          {...register('terms', { required: 'You must accept the terms' })}
        />
        <label htmlFor="terms" className="text-[12.5px] text-muted-foreground leading-relaxed cursor-pointer">
          I agree to the{' '}
          <span className="text-primary hover:underline cursor-pointer">Terms of Service</span>{' '}
          and{' '}
          <span className="text-primary hover:underline cursor-pointer">Privacy Policy</span>
        </label>
      </div>
      {errors.terms && <p className="text-[12px] text-destructive -mt-2">{errors.terms.message}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-primary text-white text-[14px] font-500 rounded-lg hover:bg-primary/90 active:scale-[0.98] transition-all duration-150 disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        style={{ minHeight: '42px' }}
      >
        {loading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            <span>Creating account...</span>
          </>
        ) : (
          <>
            <CheckCircle2 size={16} />
            Create Account
          </>
        )}
      </button>

      <p className="text-center text-[13px] text-muted-foreground">
        Already have an account?{' '}
        <button type="button" onClick={onSwitchToLogin} className="text-primary font-500 hover:underline">
          Sign in
        </button>
      </p>
    </form>
  );
}