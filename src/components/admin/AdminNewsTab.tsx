'use client';

import { useEffect, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { ImageIcon, Trash2, Upload } from 'lucide-react';
import { toast } from 'sonner';

import {
  createNewsFormAction,
  deleteNewsAction,
  removeNewsImageAction,
  setNewsVisibilityAction,
  updateNewsAction,
  uploadNewsImageAction,
} from '@/actions/news';
import { NewsPostImage } from '@/components/news/NewsPostImage';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { NewsPost } from '@/types/news';

interface AdminNewsTabProps {
  news: NewsPost[];
}

export const AdminNewsTab = ({ news }: AdminNewsTabProps) => {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);

  const createPost = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Completá título y contenido');
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set('title', title.trim());
      fd.set('body', body.trim());
      if (createImageFile && createImageFile.size > 0) {
        fd.set('image', createImageFile);
      }
      const res = await createNewsFormAction(fd);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Noticia publicada');
      setTitle('');
      setBody('');
      setCreateImageFile(null);
      router.refresh();
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
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-zinc-800/80 shadow-md">
        <CardHeader>
          <CardTitle>Publicar noticia</CardTitle>
          <CardDescription>
            Las noticias visibles se muestran en el inicio y el dashboard. Podés ocultar una noticia
            sin borrarla.
          </CardDescription>
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
          <div className="space-y-2">
            <Label htmlFor="news-create-image" className="inline-flex items-center gap-1.5">
              <ImageIcon className="size-3.5 text-zinc-400" />
              Imagen (opcional, JPG, PNG o WebP, máx. 2 MB)
            </Label>
            <input
              id="news-create-image"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className={cn(
                'file:text-foreground h-9 w-full min-w-0 cursor-pointer rounded-md border border-input bg-transparent px-3 py-1 text-sm file:mr-3 file:rounded file:border-0 file:bg-zinc-800 file:px-2 file:py-1 file:text-sm',
                'focus-visible:ring-[3px] focus-visible:ring-ring/50 focus-visible:outline-none',
              )}
              onChange={(e) => setCreateImageFile(e.target.files?.[0] ?? null)}
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
                    isVisible: updated.isVisible,
                  });
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success('Noticia actualizada');
                  router.refresh();
                });
              }}
              onDelete={removePost}
              onVisibilityChange={(next) => {
                startTransition(async () => {
                  const res = await setNewsVisibilityAction(post.id, next);
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success(next ? 'Noticia visible' : 'Noticia oculta');
                  router.refresh();
                });
              }}
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
  onVisibilityChange: (isVisible: boolean) => void;
}

const NewsEditorCard = ({ post, pending, onSave, onDelete, onVisibilityChange }: NewsEditorCardProps) => {
  const [local, setLocal] = useState(post);
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const router = useRouter();
  const [, startImgTransition] = useTransition();

  useEffect(() => {
    setLocal(post);
  }, [post.id, post.updatedAt, post.imagePath]);

  return (
    <Card
      className={
        post.isVisible
          ? 'border-zinc-800/80 shadow-sm'
          : 'border-zinc-800/80 border-dotted bg-zinc-950/30 shadow-sm'
      }
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1 space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="text-base">{post.title}</CardTitle>
              {!post.isVisible && (
                <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-amber-200">
                  Oculta
                </span>
              )}
            </div>
            <CardDescription>
              {format(new Date(post.createdAt), "d MMM yyyy, HH:mm", { locale: es })}
            </CardDescription>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <div className="flex items-center gap-2 pr-1">
              <Label
                htmlFor={`news-visible-${post.id}`}
                className="cursor-pointer text-xs text-zinc-400"
              >
                Visible en inicio
              </Label>
              <Switch
                id={`news-visible-${post.id}`}
                checked={local.isVisible}
                disabled={pending}
                onCheckedChange={(c) => {
                  setLocal((prev) => ({ ...prev, isVisible: c }));
                  onVisibilityChange(c);
                }}
              />
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
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {local.imagePath && (
          <NewsPostImage
            className="w-full max-w-md rounded-md"
            imagePath={local.imagePath}
            alt={local.title}
          />
        )}
        <div className="flex flex-wrap items-center gap-2">
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className={cn(
              'file:text-foreground h-9 max-w-xs min-w-0 cursor-pointer rounded-md border border-input bg-transparent px-2 py-1 text-sm file:mr-2 file:border-0 file:bg-zinc-800 file:px-2 file:py-1',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
            disabled={pending}
            onChange={(e) => setEditImageFile(e.target.files?.[0] ?? null)}
          />
          <Button
            type="button"
            variant="secondary"
            size="sm"
            className="gap-1.5"
            disabled={pending}
            onClick={() => {
              if (!editImageFile || editImageFile.size === 0) {
                toast.error('Elegí una imagen');
                return;
              }
              const fd = new FormData();
              fd.set('image', editImageFile);
              startImgTransition(async () => {
                const res = await uploadNewsImageAction(local.id, fd);
                if (!res.success) {
                  toast.error(res.error);
                  return;
                }
                toast.success('Imagen actualizada');
                setEditImageFile(null);
                router.refresh();
              });
            }}
          >
            <Upload className="size-3.5" />
            Subir imagen
          </Button>
          {local.imagePath ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-zinc-400"
              disabled={pending}
              onClick={() => {
                startImgTransition(async () => {
                  const res = await removeNewsImageAction(local.id);
                  if (!res.success) {
                    toast.error(res.error);
                    return;
                  }
                  toast.success('Imagen eliminada');
                  setLocal((p) => ({ ...p, imagePath: null }));
                  router.refresh();
                });
              }}
            >
              Quitar imagen
            </Button>
          ) : null}
        </div>
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
