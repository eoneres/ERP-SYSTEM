'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ChevronUp, ChevronDown, ChevronsUpDown,
  ChevronLeft, ChevronRight,
  ChevronsLeft, ChevronsRight,
  Search, SlidersHorizontal,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Input } from './input';

// ─── Types ────────────────────────────────────────────────────────────────────
export interface Column<T> {
  key: keyof T | string;
  header: string;
  width?: string;
  sortable?: boolean;
  align?: 'left' | 'center' | 'right';
  cell?: (row: T, index: number) => React.ReactNode;
  className?: string;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  pagination?: PaginationMeta;
  onPageChange?: (page: number) => void;
  onLimitChange?: (limit: number) => void;
  onSort?: (key: string, dir: 'ASC' | 'DESC') => void;
  sortKey?: string;
  sortDir?: 'ASC' | 'DESC';
  searchable?: boolean;
  searchPlaceholder?: string;
  onSearch?: (query: string) => void;
  searchValue?: string;
  emptyState?: React.ReactNode;
  rowKey?: keyof T | ((row: T) => string);
  onRowClick?: (row: T) => void;
  selectedRows?: Set<string>;
  onRowSelect?: (id: string) => void;
  className?: string;
  stickyHeader?: boolean;
}

// ─── Skeleton row ─────────────────────────────────────────────────────────────
function SkeletonRow({ cols }: { cols: number }) {
  return (
    <tr>
      {Array.from({ length: cols }).map((_, i) => (
        <td key={i} className="px-4 py-3">
          <div className="skeleton h-4 rounded" style={{ width: `${60 + Math.random() * 30}%` }} />
        </td>
      ))}
    </tr>
  );
}

// ─── Sort icon ────────────────────────────────────────────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir?: 'ASC' | 'DESC' }) {
  if (!active) return <ChevronsUpDown className="h-3.5 w-3.5 text-[var(--text-subtle)]" />;
  return dir === 'ASC'
    ? <ChevronUp className="h-3.5 w-3.5 text-primary-500" />
    : <ChevronDown className="h-3.5 w-3.5 text-primary-500" />;
}

// ─── Main component ───────────────────────────────────────────────────────────
export function DataTable<T extends Record<string, any>>({
  columns,
  data,
  loading = false,
  pagination,
  onPageChange,
  onLimitChange,
  onSort,
  sortKey,
  sortDir,
  searchable = false,
  searchPlaceholder = 'Buscar...',
  onSearch,
  searchValue = '',
  emptyState,
  rowKey = 'id',
  onRowClick,
  className,
  stickyHeader = false,
}: DataTableProps<T>) {
  const getRowKey = (row: T): string => {
    if (typeof rowKey === 'function') return rowKey(row);
    return String(row[rowKey]);
  };

  const handleSort = (col: Column<T>) => {
    if (!col.sortable || !onSort) return;
    const key = String(col.key);
    const newDir = sortKey === key && sortDir === 'ASC' ? 'DESC' : 'ASC';
    onSort(key, newDir);
  };

  const LIMIT_OPTIONS = [10, 20, 50, 100];

  return (
    <div className={cn('flex flex-col gap-0 rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]', className)}>
      {/* Toolbar */}
      {searchable && (
        <div className="flex items-center gap-3 px-4 py-3 border-b border-[var(--border)] bg-[var(--surface)]">
          <div className="flex-1 max-w-xs">
            <Input
              placeholder={searchPlaceholder}
              value={searchValue}
              onChange={(e) => onSearch?.(e.target.value)}
              leftIcon={<Search />}
              size="sm"
            />
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-2)]">
              {columns.map((col) => (
                <th
                  key={String(col.key)}
                  className={cn(
                    'px-4 py-2.5 text-left text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wide whitespace-nowrap',
                    col.align === 'center' && 'text-center',
                    col.align === 'right' && 'text-right',
                    col.sortable && 'cursor-pointer select-none hover:text-[var(--text)] transition-colors',
                    col.width,
                    col.className,
                  )}
                  onClick={() => handleSort(col)}
                  style={col.width ? { width: col.width } : undefined}
                >
                  <span className="inline-flex items-center gap-1">
                    {col.header}
                    {col.sortable && (
                      <SortIcon active={sortKey === String(col.key)} dir={sortDir} />
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} cols={columns.length} />
              ))
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length}>
                  {emptyState || (
                    <div className="flex flex-col items-center justify-center py-16 text-center">
                      <div className="text-4xl mb-3">📭</div>
                      <p className="text-sm font-medium text-[var(--text)]">Nenhum registro encontrado</p>
                      <p className="text-xs text-[var(--text-muted)] mt-1">Tente ajustar os filtros ou adicionar novos registros</p>
                    </div>
                  )}
                </td>
              </tr>
            ) : (
              <AnimatePresence initial={false}>
                {data.map((row, index) => (
                  <motion.tr
                    key={getRowKey(row)}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ duration: 0.15, delay: index * 0.02 }}
                    className={cn(
                      'border-b border-[var(--border)] transition-colors',
                      'hover:bg-[var(--surface-2)]',
                      onRowClick && 'cursor-pointer',
                      index === data.length - 1 && 'border-b-0',
                    )}
                    onClick={() => onRowClick?.(row)}
                  >
                    {columns.map((col) => (
                      <td
                        key={String(col.key)}
                        className={cn(
                          'px-4 py-3 text-sm text-[var(--text)]',
                          col.align === 'center' && 'text-center',
                          col.align === 'right' && 'text-right',
                          col.className,
                        )}
                      >
                        {col.cell
                          ? col.cell(row, index)
                          : (row[col.key as keyof T] as React.ReactNode) ?? '—'}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--surface-2)]">
          <div className="flex items-center gap-2 text-xs text-[var(--text-muted)]">
            <span>Linhas por página:</span>
            <select
              value={pagination.limit}
              onChange={(e) => onLimitChange?.(Number(e.target.value))}
              className="bg-[var(--surface)] border border-[var(--border)] rounded px-2 py-1 text-xs text-[var(--text)] focus:outline-none focus:border-primary-500"
            >
              {LIMIT_OPTIONS.map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="ml-2">
              {((pagination.page - 1) * pagination.limit) + 1}–
              {Math.min(pagination.page * pagination.limit, pagination.total)}{' '}
              de {pagination.total}
            </span>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange?.(1)}
              disabled={!pagination.hasPrev}
              aria-label="Primeira página"
            >
              <ChevronsLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange?.(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              aria-label="Página anterior"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <span className="px-3 py-1 text-xs font-medium text-[var(--text)]">
              {pagination.page} / {pagination.totalPages}
            </span>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange?.(pagination.page + 1)}
              disabled={!pagination.hasNext}
              aria-label="Próxima página"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={() => onPageChange?.(pagination.totalPages)}
              disabled={!pagination.hasNext}
              aria-label="Última página"
            >
              <ChevronsRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
