import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Newspaper } from 'lucide-react';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import type { NewsPost } from '@/types/news';

interface DashboardNewsProps {
  news: NewsPost[];
}

export const DashboardNews = ({ news }: DashboardNewsProps) => {
  return (
    <Card className="border-zinc-800/80 bg-zinc-900/50 shadow-md">
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Newspaper className="size-5 text-emerald-400" />
          Noticias del día
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {news.map((post) => (
          <article
            key={post.id}
            className="rounded-lg border border-zinc-800/60 bg-zinc-950/40 p-3"
          >
            <h3 className="text-sm font-semibold text-white">{post.title}</h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {post.authorName} ·{' '}
              {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
            </p>
            <p className="mt-1.5 whitespace-pre-line text-sm leading-relaxed text-zinc-300">
              {post.body}
            </p>
          </article>
        ))}
      </CardContent>
    </Card>
  );
};
