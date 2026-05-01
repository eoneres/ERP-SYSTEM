'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { User, Mail, Lock, ArrowRight, AlertCircle, CheckCircle2 } from 'lucide-react';
import toast from 'react-hot-toast';

import { registerSchema, type RegisterFormValues } from '@/lib/validators/auth.schema';
import { authApi } from '@/lib/api/auth.api';
import { tokenStore } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Password strength indicator
function PasswordStrength({ password }: { password: string }) {
  const checks = [
    { label: 'Mínimo 8 caracteres', ok: password.length >= 8 },
    { label: 'Letra maiúscula', ok: /[A-Z]/.test(password) },
    { label: 'Letra minúscula', ok: /[a-z]/.test(password) },
    { label: 'Número', ok: /[0-9]/.test(password) },
  ];

  const score = checks.filter((c) => c.ok).length;
  const strengthLabel = ['', 'Fraca', 'Regular', 'Boa', 'Forte'][score];
  const strengthColor = ['', 'bg-danger', 'bg-warning', 'bg-primary-500', 'bg-success'][score];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-2 mt-1"
    >
      {/* Strength bar */}
      <div className="flex items-center gap-2">
        <div className="flex-1 flex gap-1">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className={`h-1 flex-1 rounded-full transition-all duration-300 ${
                i <= score ? strengthColor : 'bg-[var(--border)]'
              }`}
            />
          ))}
        </div>
        <span className="text-xs text-[var(--text-muted)] w-14 text-right">{strengthLabel}</span>
      </div>

      {/* Check list */}
      <div className="grid grid-cols-2 gap-1">
        {checks.map((c) => (
          <div key={c.label} className="flex items-center gap-1.5">
            <CheckCircle2
              className={`h-3 w-3 transition-colors ${c.ok ? 'text-success' : 'text-[var(--border-strong)]'}`}
            />
            <span className={`text-[11px] ${c.ok ? 'text-[var(--text-muted)]' : 'text-[var(--text-subtle)]'}`}>
              {c.label}
            </span>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

export default function RegisterPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
  });

  const passwordValue = watch('password', '');

  const onSubmit = async (values: RegisterFormValues) => {
    setApiError(null);
    try {
      const tenantId = tokenStore.getTenant() || 'demo-tenant';
      tokenStore.setTenant(tenantId);

      const { confirmPassword, ...payload } = values;
      const response = await authApi.register(payload);
      login(response);

      toast.success('Conta criada com sucesso! 🎉');
      router.push('/dashboard');
    } catch (err: any) {
      const msg = err?.response?.data?.message || 'Erro ao criar conta.';
      setApiError(typeof msg === 'string' ? msg : msg[0]);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-semibold text-[var(--text)]">ERPSystem</span>
        </div>
        <h2 className="text-2xl font-bold text-[var(--text)]">Criar conta</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Já tem conta?{' '}
          <Link href="/login" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
            Entrar
          </Link>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {apiError && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            className="flex items-start gap-2 rounded-lg border border-danger/30 bg-danger/10 p-3 text-sm text-danger"
          >
            <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
            <span>{apiError}</span>
          </motion.div>
        )}

        {/* Name row */}
        <div className="grid grid-cols-2 gap-3">
          <Input
            id="firstName"
            label="Nome"
            placeholder="João"
            autoComplete="given-name"
            autoFocus
            leftIcon={<User />}
            error={errors.firstName?.message}
            {...register('firstName')}
          />
          <Input
            id="lastName"
            label="Sobrenome"
            placeholder="Silva"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register('lastName')}
          />
        </div>

        <Input
          id="email"
          label="Email corporativo"
          type="email"
          placeholder="joao@empresa.com"
          autoComplete="email"
          leftIcon={<Mail />}
          error={errors.email?.message}
          {...register('email')}
        />

        <div>
          <Input
            id="password"
            label="Senha"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            leftIcon={<Lock />}
            error={errors.password?.message}
            {...register('password')}
          />
          <PasswordStrength password={passwordValue} />
        </div>

        <Input
          id="confirmPassword"
          label="Confirmar senha"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          leftIcon={<Lock />}
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Criar conta grátis
        </Button>
      </form>

      <p className="text-center text-xs text-[var(--text-subtle)]">
        Ao criar conta você concorda com os{' '}
        <Link href="/terms" className="underline hover:text-[var(--text-muted)]">Termos</Link>{' '}
        e{' '}
        <Link href="/privacy" className="underline hover:text-[var(--text-muted)]">Privacidade</Link>
      </p>
    </motion.div>
  );
}
