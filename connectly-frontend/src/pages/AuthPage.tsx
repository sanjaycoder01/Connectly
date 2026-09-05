import React from 'react';
import { AuthHero } from '../components/auth/AuthHero';
import { AuthForm } from '../components/auth/AuthForm';

export const AuthPage: React.FC = () => {
  return (
    <div className="min-h-screen w-full bg-[#f4f6fb] flex items-center justify-center p-4 sm:p-6 lg:p-10">
      <div className="w-full max-w-[1080px] bg-white rounded-3xl shadow-xl shadow-slate-900/5 border border-slate-200/80 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* Left Branding & Highlights Hero (5 cols) */}
        <div className="lg:col-span-5 flex flex-col">
          <AuthHero />
        </div>

        {/* Right Auth Form (7 cols) */}
        <div className="lg:col-span-7 flex flex-col">
          <AuthForm />
        </div>
      </div>
    </div>
  );
};
