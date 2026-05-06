'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard, DollarSign, Package, ShoppingCart,
  Users, BarChart3, Settings, ChevronLeft, ChevronRight,
  LogOut, Bell, HelpCircle, Building2, ChevronDown, ShoppingBag,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/store/ui.store';
import { useAuthStore } from '@/store/auth.store';
import { Avatar } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import * as React from 'react';

// ─── Nav config ───────────────────────────────────────────────────────────────
interface NavItem {
  label: string;
  href: string;
  icon: React.ElementType;
  badge?: string | number;
  badgeVariant?: 'primary' | 'danger' | 'warning' | 'success';
  children?: Omit<NavItem, 'children' | 'icon'>[];
  permission?: string;
}

const NAV_ITEMS: NavItem[] = [
  {
    label: 'Dashboard',
    href: '/dashboard',
    icon: LayoutDashboard,
  },
  {
    label: 'Financeiro',
    href: '/finance',
    icon: DollarSign,
    children: [
      { label: 'Visão Geral', href: '/finance' },
      { label: 'Contas a Pagar', href: '/finance/payable' },
      { label: 'Contas a Receber', href: '/finance/receivable' },
      { label: 'Fluxo de Caixa', href: '/finance/cashflow' },
      { label: 'Categorias', href: '/finance/categories' },
    ],
  },
  {
    label: 'Estoque',
    href: '/inventory',
    icon: Package,
    children: [
      { label: 'Produtos', href: '/inventory/products' },
      { label: 'Movimentações', href: '/inventory/movements' },
      { label: 'Depósitos', href: '/inventory/warehouses' },
    ],
  },
  {
    label: 'Vendas',
    href: '/sales',
    icon: ShoppingCart,
    children: [
      { label: 'Pedidos',     href: '/sales/orders'    },
      { label: 'Clientes',    href: '/sales/customers' },
      { label: 'Faturamento', href: '/sales/invoices'  },
    ],
  },
  {
    label: 'Compras',
    href: '/purchases',
    icon: ShoppingBag,
    children: [
      { label: 'Visão Geral',     href: '/purchases'            },
      { label: 'Ordens de Compra', href: '/purchases/orders'   },
      { label: 'Fornecedores',    href: '/purchases/suppliers' },
    ],
  },
  {
    label: 'RH',
    href: '/hr',
    icon: Users,
    children: [
      { label: 'Colaboradores',      href: '/hr/employees'   },
      { label: 'Usuários do Sistema', href: '/hr/users'       },
      { label: 'Permissões',         href: '/hr/permissions' },
      { label: 'Folha de Pagamento', href: '/hr/payroll'     },
      { label: 'Controle de Ponto',  href: '/hr/attendance'  },
    ],
  },
  {
    label: 'Relatórios',
    href: '/reports',
    icon: BarChart3,
  },
];

const BOTTOM_ITEMS: NavItem[] = [
  { label: 'Configurações', href: '/settings/company', icon: Settings },
  { label: 'Ajuda',          href: '/help',             icon: HelpCircle },
];

// ─── NavItem component ────────────────────────────────────────────────────────
function NavItemComponent({
  item,
  collapsed,
  depth = 0,
}: {
  item: NavItem;
  collapsed: boolean;
  depth?: number;
}) {
  const pathname = usePathname();
  const [open, setOpen] = React.useState(() => {
    if (!item.children) return false;
    return item.children.some((c) => pathname === c.href) || pathname === item.href;
  });

  const isActive =
    pathname === item.href ||
    (item.children?.some((c) => pathname === c.href) ?? false);

  const Icon = item.icon;
  const hasChildren = !!item.children?.length;

  if (hasChildren && !collapsed) {
    return (
      <div>
        <button
          onClick={() => setOpen((v) => !v)}
          className={cn(
            'nav-item w-full',
            isActive && 'text-[var(--text)]',
          )}
        >
          <Icon className="h-4 w-4 shrink-0" />
          <span className="flex-1 text-left">{item.label}</span>
          {item.badge && (
            <Badge variant={item.badgeVariant ?? 'primary'} size="sm">
              {item.badge}
            </Badge>
          )}
          <ChevronDown
            className={cn(
              'h-3.5 w-3.5 shrink-0 transition-transform duration-200',
              open && 'rotate-180',
            )}
          />
        </button>

        <AnimatePresence initial={false}>
          {open && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="overflow-hidden"
            >
              <div className="ml-4 mt-0.5 pl-3 border-l border-[var(--border)] space-y-0.5 pb-1">
                {item.children!.map((child) => (
                  <Link
                    key={child.href}
                    href={child.href}
                    className={cn(
                      'flex items-center gap-2 px-2 py-1.5 rounded text-xs font-medium transition-all duration-150',
                      pathname === child.href
                        ? 'text-primary-500 bg-primary-500/10'
                        : 'text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)]',
                    )}
                  >
                    {child.label}
                    {child.badge && (
                      <Badge variant={child.badgeVariant ?? 'primary'} size="sm">
                        {child.badge}
                      </Badge>
                    )}
                  </Link>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <Link
      href={item.href}
      className={cn(
        'nav-item',
        isActive && 'active',
        collapsed && 'justify-center px-0',
      )}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-4 w-4 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{item.label}</span>
          {item.badge && (
            <Badge variant={item.badgeVariant ?? 'primary'} size="sm">
              {item.badge}
            </Badge>
          )}
        </>
      )}
    </Link>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────
export function Sidebar() {
  const { sidebarCollapsed, toggleCollapsed } = useUIStore();
  const { user, logout } = useAuthStore();

  const width = sidebarCollapsed ? 68 : 260;

  return (
    <motion.aside
      animate={{ width }}
      transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
      className="fixed left-0 top-0 bottom-0 z-40 flex flex-col border-r border-[var(--border)] bg-[var(--surface)] overflow-hidden"
      style={{ width }}
    >
      {/* Header */}
      <div className={cn(
        'flex items-center h-14 px-3 border-b border-[var(--border)] shrink-0',
        sidebarCollapsed ? 'justify-center' : 'justify-between',
      )}>
        {!sidebarCollapsed && (
          <Link href="/dashboard" className="flex items-center gap-2.5 min-w-0">
            <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center shrink-0">
              <span className="text-white font-bold text-xs">E</span>
            </div>
            <span className="font-semibold text-sm text-[var(--text)] truncate">ERPSystem</span>
          </Link>
        )}

        {sidebarCollapsed && (
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-primary-500 to-secondary-600 flex items-center justify-center">
            <span className="text-white font-bold text-xs">E</span>
          </div>
        )}

        <button
          onClick={toggleCollapsed}
          className={cn(
            'p-1 rounded-md text-[var(--text-muted)] hover:bg-[var(--surface-2)] hover:text-[var(--text)] transition-colors',
            sidebarCollapsed && 'absolute -right-3 top-[18px] bg-[var(--surface)] border border-[var(--border)] shadow-sm z-10',
          )}
          aria-label={sidebarCollapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
        >
          {sidebarCollapsed
            ? <ChevronRight className="h-3.5 w-3.5" />
            : <ChevronLeft className="h-3.5 w-3.5" />}
        </button>
      </div>

      {/* Tenant badge */}
      {!sidebarCollapsed && (
        <div className="mx-3 mt-3 px-2.5 py-2 rounded-lg bg-[var(--surface-2)] border border-[var(--border)] flex items-center gap-2">
          <Building2 className="h-3.5 w-3.5 text-[var(--text-muted)] shrink-0" />
          <span className="text-xs font-medium text-[var(--text-muted)] truncate">
            {user?.tenantId ?? 'Empresa'}
          </span>
        </div>
      )}

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden px-2 py-3 space-y-0.5">
        {NAV_ITEMS.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            collapsed={sidebarCollapsed}
          />
        ))}
      </nav>

      {/* Bottom section */}
      <div className="px-2 pb-2 space-y-0.5 border-t border-[var(--border)] pt-2">
        {BOTTOM_ITEMS.map((item) => (
          <NavItemComponent
            key={item.href}
            item={item}
            collapsed={sidebarCollapsed}
          />
        ))}

        {/* User profile */}
        <div
          className={cn(
            'flex items-center gap-2.5 px-2 py-2 rounded-md mt-1 cursor-pointer',
            'hover:bg-[var(--surface-2)] transition-colors group',
            sidebarCollapsed && 'justify-center',
          )}
        >
          <Avatar
            name={user ? `${user.firstName} ${user.lastName}` : ''}
            src={user?.avatarUrl}
            size="sm"
            status="online"
          />
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-xs font-medium text-[var(--text)] truncate">
                {user?.firstName} {user?.lastName}
              </p>
              <p className="text-[10px] text-[var(--text-muted)] truncate">{user?.email}</p>
            </div>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={() => logout()}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-[var(--surface-3)] text-[var(--text-muted)]"
              title="Sair"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>
    </motion.aside>
  );
}
