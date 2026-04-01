'use client';

import { useState, useTransition } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Trash2 } from 'lucide-react';
import { toast } from 'sonner';

import { createNewsAction, deleteNewsAction, updateNewsAction } from '@/actions/news';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { NewsPost } from '@/types/news';

interface AdminNewsTabProps {
  news: NewsPost[];
}

export const AdminNewsTab = ({ news }: AdminNewsTabProps) => {
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  const createPost = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Completá título y contenido');
      return;
    }

    startTransition(async () => {
      const res = await createNewsAction({ title: title.trim(), body: body.trim() });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Noticia publicada');
      setTitle('');
      setBody('');
    });
  };

  const removePost = (id: string) => {
    startTransition(async () => {
      const res = await deleteNewsAction(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Noticia eliminada');
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Publicar noticia</CardTitle>
          <CardDescription>Las noticias se muestran en el inicio y el dashboard.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="news-title">Título</Label>
            <Input
              id="news-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ej: Arranca la fase de grupos"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="news-body">Contenido</Label>
            <Textarea
              id="news-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              rows={4}
              placeholder="Escribí el contenido de la noticia..."
            />
          </div>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={pending}
            onClick={createPost}
          >
            Publicar
          </Button>
        </CardContent>
      </Card>

      {news.length === 0 ? (
        <p className="text-sm text-muted-foreground">No hay noticias publicadas todavía.</p>
      ) : (
        <div className="space-y-4">
          {news.map((post) => (
            <NewsEditorCard
              key={post.id}
              post={post}
              pending={pending}
              onSave={(updated) => {
                startTransition(async () => {
                  const res = await updateNewsAction(updated.id, {
                    title: updated.title,
                    body: updated.body,
                  });
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success('Noticia actualizada');
                });
              }}
              onDelete={removePost}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface NewsEditorCardProps {
  post: NewsPost;
  pending: boolean;
  onSave: (post: NewsPost) => void;
  onDelete: (id: string) => void;
}

const NewsEditorCard = ({ post, pending, onSave, onDelete }: NewsEditorCardProps) => {
  const [local, setLocal] = useState(post);

  return (
    <Card className="border-zinc-800/80 shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 space-y-1">
            <CardTitle className="text-base">{post.title}</CardTitle>
            <CardDescription>
              {post.authorName} ·{' '}
              {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
            </CardDescription>
          </div>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 text-red-400 hover:bg-red-500/10 hover:text-red-300"
            disabled={pending}
            onClick={() => onDelete(post.id)}
          >
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <Input
          value={local.title}
          onChange={(e) => setLocal((prev) => ({ ...prev, title: e.target.value }))}
        />
        <Textarea
          rows={3}
          value={local.body}
          onChange={(e) => setLocal((prev) => ({ ...prev, body: e.target.value }))}
        />
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() => onSave(local)}
        >
          Guardar cambios
        </Button>
      </CardContent>
    </Card>
  );
};
