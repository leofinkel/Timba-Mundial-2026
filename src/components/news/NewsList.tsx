import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Newspaper } from 'lucide-react';

import { NewsPostImage } from '@/components/news/NewsPostImage';
import type { NewsPost } from '@/types/news';

interface NewsListProps {
  news: NewsPost[];
}

export const NewsList = ({ news }: NewsListProps) => {
  if (news.length === 0) {
    return null;
  }

  return (
    <section
      className="mt-16 rounded-2xl border border-emerald-500/15 bg-zinc-900/50 p-6 backdrop-blur-sm sm:mt-20 sm:p-8"
      aria-labelledby="landing-news"
    >
      <h2
        id="landing-news"
        className="flex items-center gap-2 text-lg font-semibold text-white"
      >
        <Newspaper className="size-5 text-emerald-400" />
        Noticias del día
      </h2>

      <div className="mt-5 space-y-4">
        {news.map((post) => (
          <article
            key={post.id}
            className="rounded-lg border border-zinc-800/80 bg-zinc-950/40 p-4"
          >
            <h3 className="text-base font-semibold text-white">{post.title}</h3>
            <p className="mt-1 text-xs text-zinc-500">
              {format(new Date(post.createdAt), "d 'de' MMMM yyyy, HH:mm", { locale: es })}
            </p>
            <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {post.body}
            </p>
            {post.imagePath ? (
              <NewsPostImage
                className="mt-3 rounded-md"
                imagePath={post.imagePath}
                alt={post.title}
              />
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
};
