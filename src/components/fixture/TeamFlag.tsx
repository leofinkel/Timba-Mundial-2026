import Image from 'next/image';

import { cn } from '@/lib/utils';
import type { Team } from '@/types/tournament';

type TeamFlagProps = {
  team: Pick<Team, 'flagUrl' | 'name'>;
  size?: 'sm' | 'md';
  className?: string;
};

const sizeClasses = {
  sm: 'h-4 w-5',
  md: 'h-5 w-7',
} as const;

export const TeamFlag = ({ team, size = 'md', className }: TeamFlagProps) => {
  const sizeClass = sizeClasses[size];
  const dimensions = size === 'sm' ? { width: 20, height: 16 } : { width: 28, height: 20 };

  if (!team.flagUrl) {
    return (
      <span
        className={cn(
          'flex shrink-0 items-center justify-center rounded-sm border border-dashed border-muted-foreground/40 text-[8px] text-muted-foreground',
          sizeClass,
          className,
        )}
      >
        —
      </span>
    );
  }

  return (
    <Image
      src={team.flagUrl}
      alt={team.name}
      width={dimensions.width}
      height={dimensions.height}
      className={cn('shrink-0 rounded-sm border border-border/60 object-cover', sizeClass, className)}
    />
  );
};
