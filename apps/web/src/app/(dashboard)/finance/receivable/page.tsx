'use client';
import { useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';
import { TransactionListPage } from '@/components/modules/finance/transaction-list-page';

export default function ReceivablePage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  useEffect(() => {
    setPageTitle('Contas a Receber');
    setBreadcrumbs([{ label: 'Financeiro', href: '/finance' }, { label: 'Contas a Receber' }]);
  }, [setPageTitle, setBreadcrumbs]);

  return (
    <TransactionListPage
      type="income"
      title="Contas a Receber"
      emptyMessage="Nenhuma receita cadastrada"
    />
  );
}
