'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';

import { MAIN_NAV_LINKS } from '@/constants/navigation';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import type { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';
import { Menu } from 'lucide-react';

interface MobileNavProps {
  user: UserProfile;
  isAdmin: boolean;
  paymentBadgeClass: string;
  paymentBadgeLabel: string;
}

export const MobileNav = ({
  user,
  isAdmin,
  paymentBadgeClass,
  paymentBadgeLabel,
}: MobileNavProps) => {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="text-zinc-300 hover:bg-zinc-800 hover:text-white md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] border-zinc-800 bg-zinc-950">
        <SheetHeader>
          <SheetTitle className="text-left font-semibold text-white">
            Timba Mundial 2026
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1">
          {MAIN_NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                variant="ghost"
                className={cn(
                  'justify-start font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white',
                  active && 'bg-zinc-800 text-white',
                )}
                asChild
              >
                <Link href={link.href} onClick={() => setOpen(false)}>
                  {link.label}
                </Link>
              </Button>
            );
          })}
          {isAdmin ? (
            <Button
              variant="ghost"
              className={cn(
                'justify-start font-medium text-zinc-300 hover:bg-zinc-800 hover:text-white',
                pathname.startsWith('/admin') && 'bg-zinc-800 text-white',
              )}
              asChild
            >
              <Link href="/admin" onClick={() => setOpen(false)}>
                Admin
              </Link>
            </Button>
          ) : null}
        </div>
        <Separator className="my-4 bg-zinc-800" />
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-zinc-400 text-xs uppercase tracking-wide">Usuario</p>
            <p className="font-medium text-zinc-100">{user.displayName}</p>
            <p className="truncate text-xs text-zinc-400">{user.email}</p>
          </div>
          <div>
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-400">Pago</p>
            <Badge className={paymentBadgeClass}>{paymentBadgeLabel}</Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
