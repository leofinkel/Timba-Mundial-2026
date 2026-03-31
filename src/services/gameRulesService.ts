import 'server-only';

import { createServiceLogger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';
import { listGameRules } from '@/repositories/gameRuleRepository';
import type { AdminGameRule } from '@/types/admin';

const log = createServiceLogger('gameRulesService');

export const listPublicGameRules = async (): Promise<AdminGameRule[]> => {
  try {
    const supabase = createAdminClient();
    const rules = await listGameRules(supabase);
    const activeRules = rules.filter((rule) => rule.isActive);
    log.debug({ count: activeRules.length }, 'listPublicGameRules');
    return activeRules;
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    log.warn({ err: message }, 'listPublicGameRules fallback to static constants');
    return [];
  }
};
