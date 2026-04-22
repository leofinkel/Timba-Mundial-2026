-- news_posts: optional image path in public 'news' storage bucket
ALTER TABLE public.news_posts
  ADD COLUMN IF NOT EXISTS image_path TEXT;

COMMENT ON COLUMN public.news_posts.image_path IS
  'Object path in storage bucket news, e.g. {post_id}/image.jpg';

INSERT INTO storage.buckets (id, name, public)
VALUES ('news', 'news', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "news_select_public" ON storage.objects;
DROP POLICY IF EXISTS "news_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "news_update_admin" ON storage.objects;
DROP POLICY IF EXISTS "news_delete_admin" ON storage.objects;

CREATE POLICY "news_select_public"
  ON storage.objects
  FOR SELECT
  TO public
  USING (bucket_id = 'news');

CREATE POLICY "news_insert_admin"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'news' AND public.is_admin());

CREATE POLICY "news_update_admin"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'news' AND public.is_admin())
  WITH CHECK (bucket_id = 'news' AND public.is_admin());

CREATE POLICY "news_delete_admin"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (bucket_id = 'news' AND public.is_admin());
