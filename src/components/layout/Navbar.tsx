'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { MAIN_NAV_LINKS } from '@/constants/navigation';
import { logoutAction } from '@/actions/auth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MobileNav } from '@/components/layout/MobileNav';
import type { UserProfile } from '@/types/auth';
import { cn } from '@/lib/utils';
import { LogOut, Shield, User, UserRound } from 'lucide-react';

interface NavbarProps {
  user: UserProfile;
}

const initialsFromName = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
};

export const Navbar = ({ user }: NavbarProps) => {
  const pathname = usePathname();
  const isAdmin = user.role === 'admin';
  const isPaid = user.paymentStatus === 'paid';
  const paymentBadgeLabel = isPaid ? 'Habilitado' : 'Pendiente de Pago';
  const paymentBadgeClass = isPaid
    ? 'border-transparent bg-emerald-600 text-white hover:bg-emerald-600/90'
    : 'border-transparent bg-red-600 text-white hover:bg-red-600/90';

  return (
    <header className="sticky top-0 z-50 border-b border-emerald-950/10 bg-background/90 shadow-sm backdrop-blur-md supports-[backdrop-filter]:bg-background/75">
      <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4 sm:px-6">
        <MobileNav
          user={user}
          isAdmin={isAdmin}
          paymentBadgeClass={paymentBadgeClass}
          paymentBadgeLabel={paymentBadgeLabel}
        />

        <Link
          href="/dashboard"
          className="flex shrink-0 items-center gap-2 font-bold tracking-tight text-emerald-700"
        >
          <span className="bg-emerald-600/15 text-emerald-800 ring-emerald-600/20 inline-flex size-8 items-center justify-center rounded-lg text-sm ring-1">
            ⚽
          </span>
          <span className="hidden sm:inline">Timba Mundial 2026</span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 md:flex">
          {MAIN_NAV_LINKS.map((link) => {
            const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Button
                key={link.href}
                variant="ghost"
                size="sm"
                className={cn(
                  'font-medium',
                  active && 'bg-emerald-600/10 text-emerald-800',
                )}
                asChild
              >
                <Link href={link.href}>{link.label}</Link>
              </Button>
            );
          })}
          {isAdmin ? (
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                'font-medium',
                pathname.startsWith('/admin') && 'bg-emerald-600/10 text-emerald-800',
              )}
              asChild
            >
              <Link href="/admin" className="gap-1.5">
                <Shield className="size-3.5" />
                Admin
              </Link>
            </Button>
          ) : null}
        </nav>

        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <Badge
            className={cn(
              'hidden text-xs font-semibold sm:inline-flex',
              paymentBadgeClass,
            )}
          >
            {paymentBadgeLabel}
          </Badge>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="relative size-9 rounded-full p-0">
                <Avatar className="size-9 border border-emerald-600/30">
                  {user.avatarUrl ? (
                    <AvatarImage src={user.avatarUrl} alt={user.displayName} />
                  ) : null}
                  <AvatarFallback className="bg-emerald-600/15 text-sm font-semibold text-emerald-800">
                    {user.avatarUrl ? (
                      initialsFromName(user.displayName)
                    ) : (
                      <UserRound className="size-4" />
                    )}
                  </AvatarFallback>
                </Avatar>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-0.5">
                  <span>{user.displayName}</span>
                  <span className="text-muted-foreground text-xs font-normal">
                    {user.email}
                  </span>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="cursor-pointer">
                  <User className="mr-2 size-4" />
                  Mi perfil
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem className="sm:hidden" disabled>
                <Badge className={paymentBadgeClass}>{paymentBadgeLabel}</Badge>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-red-600 focus:text-red-600"
                onSelect={() => {
                  void logoutAction();
                }}
              >
                <LogOut className="mr-2 size-4" />
                Cerrar sesión
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
