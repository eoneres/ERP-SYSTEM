'use client';

import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Pencil, Trash2, Tag } from 'lucide-react';
import { motion } from 'framer-motion';
import { useForm } from 'react-hook-form';
import { financeApi } from '@/lib/api/finance.api';
import { useUIStore } from '@/store/ui.store';
import { Modal } from '@/components/ui/modal';
import { Button } from '@/components/ui/button';

const COLORS = ['#10B981','#3B82F6','#8B5CF6','#EF4444','#F59E0B','#EC4899','#06B6D4','#F97316','#6B7280'];

export default function CategoriesPage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  const qc = useQueryClient();
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  useEffect(() => {
    setPageTitle('Categorias');
    setBreadcrumbs([{ label: 'Financeiro', href: '/finance' }, { label: 'Categorias' }]);
  }, [setPageTitle, setBreadcrumbs]);

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['finance-categories'],
    queryFn: () => financeApi.getCategories(),
  });

  const { register, handleSubmit, reset, watch, setValue } = useForm({
    defaultValues: { name: '', type: 'expense', color: '#6B7280', icon: 'tag', description: '' },
  });

  const selectedColor = watch('color');

  const saveMutation = useMutation({
    mutationFn: (data: any) =>
      editing ? financeApi.updateCategory(editing.id, data) : financeApi.createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['finance-categories'] });
      setModalOpen(false);
      reset();
      setEditing(null);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => financeApi.deleteCategory(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['finance-categories'] }),
  });

  const openNew = () => { setEditing(null); reset(); setModalOpen(true); };
  const openEdit = (cat: any) => {
    setEditing(cat);
    reset({ name: cat.name, type: cat.type, color: cat.color, icon: cat.icon, description: cat.description });
    setModalOpen(true);
  };

  const income = categories.filter((c: any) => c.type === 'income');
  const expense = categories.filter((c: any) => c.type === 'expense');

  const GroupList = ({ title, items, colorClass }: { title: string; items: any[]; colorClass: string }) => (
    <div>
      <h3 className={`mb-3 text-sm font-semibold uppercase tracking-wider ${colorClass}`}>{title}</h3>
      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-muted)] py-4 text-center">Nenhuma categoria ainda</p>
      ) : (
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((cat: any) => (
            <motion.div key={cat.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2.5"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-3 w-3 rounded-full shrink-0" style={{ background: cat.color }} />
                <span className="text-sm font-medium text-[var(--text)] truncate">{cat.name}</span>
              </div>
              <div className="flex gap-1 shrink-0 ml-2">
                <button onClick={() => openEdit(cat)}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface)] transition-colors">
                  <Pencil className="h-3.5 w-3.5" />
                </button>
                <button onClick={() => deleteMutation.mutate(cat.id)}
                  className="rounded p-1 text-[var(--text-muted)] hover:text-red-400 hover:bg-red-500/10 transition-colors">
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-[var(--text)]">Categorias</h1>
          <p className="text-sm text-[var(--text-muted)]">Organize suas transações por categoria</p>
        </div>
        <Button size="sm" onClick={openNew} leftIcon={<Plus className="h-4 w-4" />}>
          Nova Categoria
        </Button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16 text-[var(--text-muted)]">Carregando...</div>
      ) : (
        <div className="space-y-8">
          <GroupList title="Receitas" items={income} colorClass="text-emerald-400" />
          <GroupList title="Despesas" items={expense} colorClass="text-red-400" />
        </div>
      )}

      <Modal open={modalOpen} onClose={() => { setModalOpen(false); setEditing(null); reset(); }}
        title={editing ? 'Editar Categoria' : 'Nova Categoria'}
        footer={
          <>
            <Button variant="outline" size="sm" onClick={() => setModalOpen(false)}>Cancelar</Button>
            <Button size="sm" loading={saveMutation.isPending} onClick={handleSubmit((d) => saveMutation.mutate(d))}>
              Salvar
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Nome *</label>
            <input className="input-base h-9" placeholder="Ex: Vendas de Produtos" {...register('name', { required: true })} />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Tipo *</label>
            <select className="input-base h-9" {...register('type')}>
              <option value="income">Receita</option>
              <option value="expense">Despesa</option>
            </select>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Cor</label>
            <div className="flex gap-2 flex-wrap">
              {COLORS.map((c) => (
                <button key={c} type="button" onClick={() => setValue('color', c)}
                  className={`h-7 w-7 rounded-full transition-transform ${selectedColor === c ? 'scale-125 ring-2 ring-white ring-offset-1 ring-offset-[var(--surface)]' : 'hover:scale-110'}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-sm font-medium text-[var(--text)]">Descrição</label>
            <input className="input-base h-9" placeholder="Opcional" {...register('description')} />
          </div>
        </div>
      </Modal>
    </div>
  );
}
