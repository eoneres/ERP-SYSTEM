'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Command } from 'cmdk';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, DollarSign, Package, ShoppingCart,
  Users, BarChart3, Settings, Search, ArrowRight,
} from 'lucide-react';
import { useUIStore } from '@/store/ui.store';
import { cn } from '@/lib/utils';

const COMMANDS = [
  { group: 'Navegação', id: 'dashboard', label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard, keywords: 'inicio home' },
  { group: 'Navegação', id: 'finance', label: 'Financeiro', href: '/finance', icon: DollarSign, keywords: 'dinheiro conta financas' },
  { group: 'Navegação', id: 'inventory', label: 'Estoque', href: '/inventory', icon: Package, keywords: 'produto item estoque' },
  { group: 'Navegação', id: 'sales', label: 'Vendas / Pedidos', href: '/sales', icon: ShoppingCart, keywords: 'venda pedido cliente' },
  { group: 'Navegação', id: 'hr', label: 'Recursos Humanos', href: '/hr', icon: Users, keywords: 'funcionario rh folha' },
  { group: 'Navegação', id: 'reports', label: 'Relatórios', href: '/reports', icon: BarChart3, keywords: 'relatorio grafico' },
  { group: 'Configurações', id: 'settings', label: 'Configurações', href: '/settings', icon: Settings, keywords: 'config ajuste' },
];

export function CommandPalette() {
  const { commandOpen, setCommandOpen } = useUIStore();
  const router = useRouter();

  const close = useCallback(() => setCommandOpen(false), [setCommandOpen]);

  const runCommand = useCallback(
    (href: string) => {
      close();
      router.push(href);
    },
    [close, router],
  );

  // Group commands
  const groups = COMMANDS.reduce<Record<string, typeof COMMANDS>>(
    (acc, cmd) => {
      if (!acc[cmd.group]) acc[cmd.group] = [];
      acc[cmd.group].push(cmd);
      return acc;
    },
    {},
  );

  return (
    <AnimatePresence>
      {commandOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            onClick={close}
          />

          {/* Panel */}
          <motion.div
            initial={{ opacity: 0, scale: 0.96, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: -10 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            className="fixed left-1/2 top-[20vh] z-50 -translate-x-1/2 w-full max-w-lg"
          >
            <Command
              className="rounded-xl border border-[var(--border)] bg-[var(--surface)] shadow-surface-lg overflow-hidden"
              loop
            >
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)]">
                <Search className="h-4 w-4 text-[var(--text-muted)] shrink-0" />
                <Command.Input
                  autoFocus
                  placeholder="Buscar páginas, ações..."
                  className="flex-1 bg-transparent text-sm text-[var(--text)] placeholder:text-[var(--text-subtle)] outline-none"
                />
                <kbd
                  className="px-1.5 py-0.5 text-[10px] font-medium rounded border border-[var(--border)] text-[var(--text-subtle)]"
                  onClick={close}
                >
                  ESC
                </kbd>
              </div>

              <Command.List className="max-h-80 overflow-y-auto p-2">
                <Command.Empty className="py-8 text-center text-sm text-[var(--text-muted)]">
                  Nenhum resultado encontrado.
                </Command.Empty>

                {Object.entries(groups).map(([group, items]) => (
                  <Command.Group
                    key={group}
                    heading={group}
                    className="[&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-[10px] [&_[cmdk-group-heading]]:font-semibold [&_[cmdk-group-heading]]:uppercase [&_[cmdk-group-heading]]:tracking-wider [&_[cmdk-group-heading]]:text-[var(--text-subtle)]"
                  >
                    {items.map((cmd) => {
                      const Icon = cmd.icon;
                      return (
                        <Command.Item
                          key={cmd.id}
                          value={`${cmd.label} ${cmd.keywords}`}
                          onSelect={() => runCommand(cmd.href)}
                          className={cn(
                            'flex items-center gap-3 px-2 py-2 rounded-md cursor-pointer text-sm',
                            'text-[var(--text-muted)] transition-colors',
                            'data-[selected=true]:bg-primary-500/10 data-[selected=true]:text-primary-500',
                            'hover:bg-[var(--surface-2)]',
                          )}
                        >
                          <Icon className="h-4 w-4 shrink-0" />
                          <span className="flex-1">{cmd.label}</span>
                          <ArrowRight className="h-3.5 w-3.5 opacity-0 data-[selected=true]:opacity-100" />
                        </Command.Item>
                      );
                    })}
                  </Command.Group>
                ))}
              </Command.List>

              {/* Footer */}
              <div className="flex items-center gap-4 px-4 py-2 border-t border-[var(--border)] bg-[var(--surface-2)]">
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-subtle)]">
                  <kbd className="px-1 py-0.5 rounded border border-[var(--border)] font-mono">↑↓</kbd>
                  navegar
                </span>
                <span className="flex items-center gap-1 text-[10px] text-[var(--text-subtle)]">
                  <kbd className="px-1 py-0.5 rounded border border-[var(--border)] font-mono">↵</kbd>
                  selecionar
                </span>
              </div>
            </Command>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
