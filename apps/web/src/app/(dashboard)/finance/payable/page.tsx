'use client';
import { useEffect } from 'react';
import { useUIStore } from '@/store/ui.store';
import { TransactionListPage } from '@/components/modules/finance/transaction-list-page';

export default function PayablePage() {
  const { setPageTitle, setBreadcrumbs } = useUIStore();
  useEffect(() => {
    setPageTitle('Contas a Pagar');
    setBreadcrumbs([{ label: 'Financeiro', href: '/finance' }, { label: 'Contas a Pagar' }]);
  }, [setPageTitle, setBreadcrumbs]);

  return (
    <TransactionListPage
      type="expense"
      title="Contas a Pagar"
      emptyMessage="Nenhuma despesa cadastrada"
    />
  );
}
