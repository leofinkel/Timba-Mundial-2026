-- news_posts: allow admins to hide items from the landing page and dashboard without deleting.

ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS is_visible BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN public.news_posts.is_visible IS
  'When false, the post is not listed on the public home or user dashboard.';

CREATE INDEX IF NOT EXISTS idx_news_posts_visible_created_at
  ON public.news_posts (is_visible, created_at DESC)
  WHERE is_visible = true;
