import React, { useState } from 'react';
import { Eye, EyeOff, ArrowRight, ShieldCheck } from 'lucide-react';
import type { AuthMode } from '../../types/auth';
import { Input } from '../common/Input';
import { Button } from '../common/Button';
import { SocialButton } from './SocialButton';

interface AuthFormProps {
  initialMode?: AuthMode;
  onSuccess?: () => void;
}

export const AuthForm: React.FC<AuthFormProps> = ({ initialMode = 'signin' }) => {
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    rememberMe: true,
    termsAccepted: true,
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // UI demo state - APIs will be hooked up in the next step per prompt
    console.log('Form submitted:', { mode, ...formData });
  };

  return (
    <div className="flex-1 flex flex-col justify-between p-8 sm:p-10 lg:p-12 bg-white rounded-b-3xl lg:rounded-bl-none lg:rounded-r-3xl">
      {/* Top Bar: Mode Switcher & Operational Status */}
      <div className="flex items-center justify-between gap-4 mb-8">
        {/* Segmented Mode Pill */}
        <div className="inline-flex p-1 bg-[#e4ebf8] rounded-xl">
          <button
            type="button"
            onClick={() => setMode('signin')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signin'
                ? 'bg-[#3b32c8] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => setMode('signup')}
            className={`px-4 py-1.5 text-xs font-semibold rounded-lg transition-all ${
              mode === 'signup'
                ? 'bg-[#3b32c8] text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create account
          </button>
        </div>

        {/* Network Status Badge */}
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span className="text-xs font-semibold text-emerald-800 tracking-tight">
            Network 99.99% Operational
          </span>
        </div>
      </div>

      {/* Main Form Body */}
      <div className="max-w-md w-full mx-auto my-auto py-2">
        {/* Form Heading */}
        <div className="mb-6 text-left">
          <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
            {mode === 'signin' ? 'Welcome back' : 'Create your account'}
          </h2>
          <p className="mt-1 text-xs sm:text-sm text-slate-500">
            {mode === 'signin'
              ? 'Enter your credentials to access your workspaces.'
              : 'Join Connectly to start collaborating in real-time.'}
          </p>
        </div>

        {/* Social Login Buttons */}
        <div className="flex gap-3 mb-6">
          <SocialButton provider="google" onClick={() => console.log('Google login')} />
          <SocialButton provider="github" onClick={() => console.log('GitHub login')} />
        </div>

        {/* Divider */}
        <div className="relative flex items-center justify-center mb-6">
          <div className="w-full border-t border-slate-200"></div>
          <span className="bg-white px-3 text-[11px] font-semibold tracking-wider text-slate-400 uppercase relative z-10">
            Or continue with email
          </span>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {mode === 'signup' && (
            <Input
              label="Username"
              id="username"
              type="text"
              placeholder="e.g. alex.reed"
              value={formData.username}
              onChange={(e) => setFormData({ ...formData, username: e.target.value })}
              required
            />
          )}

          <Input
            label="Work email"
            id="email"
            type="email"
            placeholder="name@company.com"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            required
          />

          <Input
            label="Password"
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••••••"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            rightLabelAction={
              mode === 'signin' ? (
                <a
                  href="#forgot-password"
                  className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 transition-colors"
                >
                  Forgot password?
                </a>
              ) : undefined
            }
            rightIcon={
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            }
          />

          {/* Checkbox */}
          <div className="flex items-center gap-2.5 pt-1">
            <input
              id="remember"
              type="checkbox"
              checked={mode === 'signin' ? formData.rememberMe : formData.termsAccepted}
              onChange={(e) =>
                mode === 'signin'
                  ? setFormData({ ...formData, rememberMe: e.target.checked })
                  : setFormData({ ...formData, termsAccepted: e.target.checked })
              }
              className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500/20 accent-indigo-600 transition-all cursor-pointer"
            />
            <label
              htmlFor="remember"
              className="text-xs font-medium text-slate-700 select-none cursor-pointer"
            >
              {mode === 'signin'
                ? 'Remember this device for 30 days'
                : 'I agree to the Terms of Service and Privacy Policy'}
            </label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            size="lg"
            className="w-full mt-2 bg-[#3f3fe2] hover:bg-[#3232cf] active:bg-[#2b2bc3] text-white font-semibold py-3 rounded-xl shadow-md shadow-indigo-500/20 flex items-center justify-center gap-2"
            rightIcon={<ArrowRight className="w-4 h-4" />}
          >
            {mode === 'signin' ? 'Sign in to Connectly' : 'Create account'}
          </Button>

          {/* Switch mode link */}
          <div className="pt-2 text-center text-xs text-slate-600">
            {mode === 'signin' ? (
              <>
                Don&apos;t have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signup')}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
                >
                  Sign up for free
                </button>
              </>
            ) : (
              <>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => setMode('signin')}
                  className="font-semibold text-indigo-600 hover:text-indigo-700 hover:underline transition-all"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>

      {/* Footer Security Notice */}
      <div className="pt-8 text-center text-[11px] text-slate-400 space-y-1.5">
        <div className="flex items-center justify-center gap-1 text-slate-500">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Protected by reCAPTCHA Enterprise</span>
        </div>
        <div className="flex items-center justify-center gap-2 text-slate-400">
          <a href="#privacy" className="hover:text-slate-600 transition-colors">
            Privacy Policy
          </a>
          <span>•</span>
          <a href="#terms" className="hover:text-slate-600 transition-colors">
            Terms of Service
          </a>
          <span>•</span>
          <a href="#security" className="hover:text-slate-600 transition-colors">
            System Security
          </a>
        </div>
      </div>
    </div>
  );
};
