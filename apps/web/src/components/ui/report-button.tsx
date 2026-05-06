'use client';

import { useState } from 'react';
import { FileDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ReportModal } from '@/components/modules/reports/report-modal';
import type { ReportModule } from '@/lib/api/reports.api';

interface Props {
  module:   ReportModule;
  size?:    'sm' | 'md';
  variant?: 'outline' | 'ghost';
  label?:   string;
}

export function ReportButton({ module, size = 'sm', variant = 'outline', label = 'Gerar Relatório' }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant={variant}
        size={size}
        leftIcon={<FileDown className="h-4 w-4" />}
        onClick={() => setOpen(true)}
      >
        {label}
      </Button>

      <ReportModal
        open={open}
        onClose={() => setOpen(false)}
        defaultModule={module}
      />
    </>
  );
}
