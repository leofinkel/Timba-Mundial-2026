-- R32 best-third visitor slot: use generic `3` only. Which group's third plays here
-- comes from the FIFA combination matrix; the fixed rival is home_source (1E, 1I, …).
UPDATE public.matches
SET
  away_source = '3'
WHERE
  stage = 'round-of-32'
  AND match_number IN (74, 77, 79, 80, 81, 82, 85, 87)
  AND away_source LIKE '3-%';
