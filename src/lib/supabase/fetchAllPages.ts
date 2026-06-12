import 'server-only';

import type { PostgrestError } from '@supabase/supabase-js';

const DEFAULT_PAGE_SIZE = 1000;

type PageResult<T> = {
  data: T[] | null;
  error: PostgrestError | null;
};

/** Fetches every row from a PostgREST query that may exceed the default 1000-row limit. */
export const fetchAllPages = async <T>(
  fetchPage: (from: number, to: number) => Promise<PageResult<T>>,
  pageSize = DEFAULT_PAGE_SIZE,
): Promise<T[]> => {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const to = from + pageSize - 1;
    const { data, error } = await fetchPage(from, to);
    if (error) {
      throw new Error(error.message);
    }

    const page = data ?? [];
    rows.push(...page);
    if (page.length < pageSize) {
      break;
    }
    from += pageSize;
  }

  return rows;
};
