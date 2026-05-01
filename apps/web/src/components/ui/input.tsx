'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Eye, EyeOff, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type InputState = 'default' | 'error' | 'success' | 'loading';

export interface InputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  label?: string;
  hint?: string;
  error?: string;
  success?: string;
  state?: InputState;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  leftAddon?: React.ReactNode;
  rightAddon?: React.ReactNode;
  size?: 'sm' | 'md' | 'lg';
  fullWidth?: boolean;
}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      hint,
      error,
      success,
      state: stateProp,
      leftIcon,
      rightIcon,
      leftAddon,
      rightAddon,
      size = 'md',
      fullWidth = true,
      className,
      type = 'text',
      disabled,
      ...props
    },
    ref,
  ) => {
    const [showPassword, setShowPassword] = React.useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    // Derive state from props
    const state: InputState = error
      ? 'error'
      : success
      ? 'success'
      : stateProp ?? 'default';

    const sizeClasses = {
      sm: 'h-8 px-3 text-xs',
      md: 'h-9 px-3 text-sm',
      lg: 'h-11 px-4 text-base',
    };

    const stateStyles: Record<InputState, string> = {
      default: 'border-[var(--border)] focus:border-primary-500 focus:ring-primary-500/20',
      error: 'border-danger focus:border-danger focus:ring-danger/20',
      success: 'border-success focus:border-success focus:ring-success/20',
      loading: 'border-[var(--border)] opacity-70',
    };

    return (
      <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
        {/* Label */}
        {label && (
          <label className="text-sm font-medium text-[var(--text)]">
            {label}
            {props.required && (
              <span className="ml-1 text-danger" aria-hidden>*</span>
            )}
          </label>
        )}

        {/* Input wrapper */}
        <div className="relative flex">
          {/* Left addon */}
          {leftAddon && (
            <div className="flex items-center px-3 rounded-l-md border border-r-0 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] text-sm whitespace-nowrap">
              {leftAddon}
            </div>
          )}

          {/* Left icon */}
          {leftIcon && !leftAddon && (
            <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none">
              {React.cloneElement(leftIcon as React.ReactElement, { className: 'h-4 w-4' })}
            </div>
          )}

          <input
            ref={ref}
            type={inputType}
            disabled={disabled || state === 'loading'}
            className={cn(
              'flex-1 bg-[var(--surface)] text-[var(--text)] placeholder:text-[var(--text-subtle)]',
              'border rounded-md transition-all duration-150 outline-none',
              'focus:ring-2',
              sizeClasses[size],
              stateStyles[state],
              leftIcon && !leftAddon && 'pl-9',
              (rightIcon || isPassword) && 'pr-9',
              state === 'error' && 'pr-9',
              state === 'success' && 'pr-9',
              leftAddon && 'rounded-l-none',
              rightAddon && 'rounded-r-none',
              disabled && 'opacity-50 cursor-not-allowed',
              className,
            )}
            aria-invalid={state === 'error'}
            aria-describedby={
              error ? `${props.id}-error` : hint ? `${props.id}-hint` : undefined
            }
            {...props}
          />

          {/* Right side icons */}
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
            {state === 'loading' && (
              <Loader2 className="h-4 w-4 animate-spin text-[var(--text-muted)]" />
            )}
            {state === 'error' && !isPassword && (
              <AlertCircle className="h-4 w-4 text-danger" />
            )}
            {state === 'success' && !isPassword && (
              <CheckCircle2 className="h-4 w-4 text-success" />
            )}
            {isPassword && state !== 'loading' && (
              <button
                type="button"
                tabIndex={-1}
                onClick={() => setShowPassword((v) => !v)}
                className="text-[var(--text-muted)] hover:text-[var(--text)] transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            )}
            {rightIcon && !isPassword && state === 'default' && (
              <span className="text-[var(--text-muted)]">
                {React.cloneElement(rightIcon as React.ReactElement, { className: 'h-4 w-4' })}
              </span>
            )}
          </div>

          {/* Right addon */}
          {rightAddon && (
            <div className="flex items-center px-3 rounded-r-md border border-l-0 border-[var(--border)] bg-[var(--surface-2)] text-[var(--text-muted)] text-sm whitespace-nowrap">
              {rightAddon}
            </div>
          )}
        </div>

        {/* Feedback messages */}
        <AnimatePresence mode="wait">
          {error && (
            <motion.p
              key="error"
              id={`${props.id}-error`}
              role="alert"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-xs text-danger"
            >
              <AlertCircle className="h-3 w-3 shrink-0" />
              {error}
            </motion.p>
          )}
          {success && !error && (
            <motion.p
              key="success"
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
              className="flex items-center gap-1 text-xs text-success"
            >
              <CheckCircle2 className="h-3 w-3 shrink-0" />
              {success}
            </motion.p>
          )}
          {hint && !error && !success && (
            <p
              id={`${props.id}-hint`}
              className="text-xs text-[var(--text-muted)]"
            >
              {hint}
            </p>
          )}
        </AnimatePresence>
      </div>
    );
  },
);

Input.displayName = 'Input';
export { Input };
