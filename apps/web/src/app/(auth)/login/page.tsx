'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { motion } from 'framer-motion';
import { Mail, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';

import { loginSchema, type LoginFormValues } from '@/lib/validators/auth.schema';
import { authApi } from '@/lib/api/auth.api';
import { tokenStore } from '@/lib/api/client';
import { useAuthStore } from '@/store/auth.store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

// Demo credentials banner
function DemoBanner() {
  return (
    <div className="rounded-lg border border-primary-500/30 bg-primary-500/10 p-3 text-xs text-primary-300 space-y-1">
      <p className="font-semibold text-primary-400 flex items-center gap-1.5">
        <span>🔑</span> Credenciais de demonstração
      </p>
      <p><span className="text-slate-400">Email:</span> admin@demo.com</p>
      <p><span className="text-slate-400">Senha:</span> Admin@123</p>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [apiError, setApiError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setValue,
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  // Auto-fill demo credentials
  const fillDemo = () => {
    setValue('email', 'admin@demo.com');
    setValue('password', 'Admin@123');
  };

  const onSubmit = async (values: LoginFormValues) => {
    setApiError(null);
    try {
      const tenantId = tokenStore.getTenant() || 'demo-tenant';
      tokenStore.setTenant(tenantId);

      const response = await authApi.login(values);
      login(response);

      toast.success(`Bem-vindo, ${response.user.firstName}! 👋`);
      router.push('/dashboard');
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        'Falha ao autenticar. Verifique suas credenciais.';
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
        {/* Mobile logo */}
        <div className="flex items-center gap-2 mb-6 lg:hidden">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
            <span className="text-white font-bold text-sm">E</span>
          </div>
          <span className="font-semibold text-[var(--text)]">ERPSystem</span>
        </div>

        <h2 className="text-2xl font-bold text-[var(--text)]">Entrar na conta</h2>
        <p className="text-sm text-[var(--text-muted)]">
          Não tem conta?{' '}
          <Link href="/register" className="text-primary-500 hover:text-primary-400 font-medium transition-colors">
            Cadastre-se grátis
          </Link>
        </p>
      </div>

      <DemoBanner />

      {/* Form */}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
        {/* API error */}
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

        <Input
          id="email"
          label="Email"
          type="email"
          placeholder="seu@email.com"
          autoComplete="email"
          autoFocus
          leftIcon={<Mail />}
          error={errors.email?.message}
          {...register('email')}
        />

        <Input
          id="password"
          label="Senha"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          leftIcon={<Lock />}
          error={errors.password?.message}
          {...register('password')}
        />

        {/* Forgot password */}
        <div className="flex justify-end">
          <Link
            href="/forgot-password"
            className="text-xs text-[var(--text-muted)] hover:text-primary-500 transition-colors"
          >
            Esqueceu a senha?
          </Link>
        </div>

        <Button
          type="submit"
          fullWidth
          size="lg"
          loading={isSubmitting}
          rightIcon={<ArrowRight className="h-4 w-4" />}
        >
          Entrar
        </Button>
      </form>

      {/* Divider */}
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-[var(--border)]" />
        </div>
        <div className="relative flex justify-center text-xs">
          <span className="bg-[var(--bg)] px-3 text-[var(--text-subtle)]">ou</span>
        </div>
      </div>

      {/* Demo fill */}
      <Button
        type="button"
        variant="outline"
        fullWidth
        onClick={fillDemo}
      >
        Preencher com dados demo
      </Button>

      {/* Terms */}
      <p className="text-center text-xs text-[var(--text-subtle)]">
        Ao entrar você concorda com os{' '}
        <Link href="/terms" className="underline hover:text-[var(--text-muted)]">Termos de Uso</Link>{' '}
        e{' '}
        <Link href="/privacy" className="underline hover:text-[var(--text-muted)]">Política de Privacidade</Link>
      </p>
    </motion.div>
  );
}
