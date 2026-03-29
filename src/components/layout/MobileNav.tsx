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
          className="md:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[min(100%,20rem)] border-emerald-950/10">
        <SheetHeader>
          <SheetTitle className="text-left font-semibold text-emerald-700">
            Timba Mundial 2026
          </SheetTitle>
        </SheetHeader>
        <div className="mt-6 flex flex-col gap-1">
          {MAIN_NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                variant={active ? 'secondary' : 'ghost'}
                className={cn(
                  'justify-start font-medium',
                  active && 'bg-emerald-600/15 text-emerald-800',
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
              variant={pathname.startsWith('/admin') ? 'secondary' : 'ghost'}
              className={cn(
                'justify-start font-medium',
                pathname.startsWith('/admin') && 'bg-emerald-600/15 text-emerald-800',
              )}
              asChild
            >
              <Link href="/admin" onClick={() => setOpen(false)}>
                Admin
              </Link>
            </Button>
          ) : null}
        </div>
        <Separator className="my-4" />
        <div className="space-y-3 text-sm">
          <div>
            <p className="text-muted-foreground text-xs uppercase tracking-wide">Usuario</p>
            <p className="font-medium">{user.displayName}</p>
            <p className="text-muted-foreground truncate text-xs">{user.email}</p>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs uppercase tracking-wide">Pago</p>
            <Badge className={paymentBadgeClass}>{paymentBadgeLabel}</Badge>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
