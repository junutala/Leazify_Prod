'use client';

import React, { useState } from 'react';
import LoginForm from './LoginForm';
import SignupForm from './SignupForm';
import { Building2, CheckCircle2 } from 'lucide-react';
import { useLanguage } from '@/contexts/LanguageContext';

export default function AuthScreen() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const { t, language, setLanguage } = useLanguage();

  const features = [
    t?.auth_feature_1,
    t?.auth_feature_2,
    t?.auth_feature_3,
    t?.auth_feature_4,
    t?.auth_feature_5,
    t?.auth_feature_6,
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0f172a] via-[#1e3a5f] to-[#0f172a] flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[45%] xl:w-[40%] flex-col justify-between p-10 xl:p-14 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 right-0 w-80 h-80 rounded-full bg-blue-500/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 w-80 h-80 rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative z-10">
          <div className="flex items-center gap-2.5 mb-12">
            <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
              <Building2 size={18} className="text-white" />
            </div>
            <span className="text-[18px] font-800 text-white tracking-tight">Leazify</span>
          </div>

          <h1 className="text-[28px] xl:text-[34px] font-900 text-white leading-[1.2] mb-4">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-cyan-400">
              {t?.auth_title}
            </span>
          </h1>
          <p className="text-[14px] text-white/50 leading-relaxed mb-8">
            {t?.auth_subtitle}
          </p>

          <div className="space-y-3">
            {features?.map((f, i) => (
              <div key={i} className="flex items-center gap-2.5">
                <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                <span className="text-[13px] text-white/70">{f}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between">
          <p className="text-[11px] text-white/30">{t?.auth_copyright}</p>
          {/* Language switcher */}
          <div className="flex items-center gap-1 bg-white/10 rounded-lg p-0.5">
            <button
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'en' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('ar')}
              className={`px-2.5 py-1 text-[11px] font-600 rounded-md transition-all duration-150 ${language === 'ar' ? 'bg-white/20 text-white' : 'text-white/40 hover:text-white/70'}`}
            >
              عر
            </button>
          </div>
        </div>
      </div>
      {/* Right panel — form */}
      <div className="flex-1 flex items-center justify-center p-4 sm:p-8">
        <div className="w-full max-w-[420px]">
          <div className="bg-white rounded-2xl shadow-2xl p-7 sm:p-8">
            {mode === 'login' ? (
              <LoginForm onSwitchToSignup={() => setMode('signup')} />
            ) : (
              <SignupForm onSwitchToLogin={() => setMode('login')} />
            )}
          </div>
          <p className="text-center text-[11px] text-white/30 mt-4">
            Secure login · Your data is encrypted and protected
          </p>
        </div>
      </div>
    </div>
  );
}