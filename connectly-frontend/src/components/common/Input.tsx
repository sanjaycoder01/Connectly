import React, { forwardRef } from 'react';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  rightLabelAction?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, rightLabelAction, rightIcon, className = '', id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    return (
      <div className="w-full">
        {(label || rightLabelAction) && (
          <div className="flex items-center justify-between mb-1.5">
            {label && (
              <label htmlFor={inputId} className="block text-xs font-semibold text-slate-700">
                {label}
              </label>
            )}
            {rightLabelAction && <div>{rightLabelAction}</div>}
          </div>
        )}

        <div className="relative">
          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-[#f0f4fd] border ${
              error ? 'border-red-400 focus:border-red-500 focus:ring-red-500/10' : 'border-transparent focus:border-indigo-500 focus:ring-indigo-500/15'
            } rounded-xl px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 transition-all outline-none focus:bg-white focus:ring-4 ${
              rightIcon ? 'pr-10' : ''
            } ${className}`}
            {...props}
          />
          {rightIcon && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
      </div>
    );
  }
);

Input.displayName = 'Input';
