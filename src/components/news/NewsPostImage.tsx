import { getStoragePublicObjectUrl } from '@/lib/supabase/storage-public-url';
import { cn } from '@/lib/utils';

type NewsPostImageProps = {
  imagePath: string;
  alt: string;
  className?: string;
};

/**
 * Renders a news image from the public "news" bucket. Uses a plain img so the URL is not blocked
 * by next/image domain rules or the image optimizer; Supabase already serves public objects with
 * cache headers. The image is scaled to fit the width without cropping (object-contain + max
 * height) so any aspect ratio displays in full.
 */
export const NewsPostImage = ({ imagePath, alt, className }: NewsPostImageProps) => {
  const src = getStoragePublicObjectUrl('news', imagePath);
  if (!src) {
    return null;
  }

  return (
    <div
      className={cn('flex w-full max-w-full justify-center bg-zinc-950/20', className)}
    >
      <img
        src={src}
        alt={alt}
        className="h-auto w-auto max-h-[min(70vh,36rem)] max-w-full object-contain"
        loading="lazy"
        decoding="async"
      />
    </div>
  );
};
