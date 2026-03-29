'use client';

import { Toaster } from '@/components/ui/sonner';
import { QueryProvider } from '@/providers/QueryProvider';
import type { PropsWithChildren } from 'react';

export const Providers = ({ children }: PropsWithChildren) => {
  return (
    <QueryProvider>
      {children}
      <Toaster />
    </QueryProvider>
  );
};
