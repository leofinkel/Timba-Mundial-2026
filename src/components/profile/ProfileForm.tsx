'use client';

import { useRef, useState, useTransition } from 'react';
import { Camera, Loader2, Save, Trash2, UserRound } from 'lucide-react';

import { updateProfileAction, uploadAvatarAction, removeAvatarAction } from '@/actions/profile';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import type { UserProfile } from '@/types/auth';

interface ProfileFormProps {
  user: UserProfile;
}

export const ProfileForm = ({ user }: ProfileFormProps) => {
  const [displayName, setDisplayName] = useState(user.displayName);
  const [avatarUrl, setAvatarUrl] = useState(user.avatarUrl);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSaveProfile = () => {
    setMessage(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set('displayName', displayName);
      const result = await updateProfileAction(fd);
      if (result.success) {
        setMessage({ type: 'success', text: 'Perfil actualizado' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    });
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    setMessage(null);

    const fd = new FormData();
    fd.set('avatar', file);
    const result = await uploadAvatarAction(fd);

    if (result.success) {
      setAvatarUrl(result.avatarUrl);
      setMessage({ type: 'success', text: 'Foto actualizada' });
    } else {
      setMessage({ type: 'error', text: result.error });
    }

    setIsUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleRemoveAvatar = () => {
    setMessage(null);
    startTransition(async () => {
      const result = await removeAvatarAction();
      if (result.success) {
        setAvatarUrl(null);
        setMessage({ type: 'success', text: 'Foto eliminada' });
      } else {
        setMessage({ type: 'error', text: result.error });
      }
    });
  };

  const initials = displayName
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase() || '?';

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-emerald-800">Mi perfil</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Administrá tu información personal y tu foto de perfil.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-red-200 bg-red-50 text-red-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Foto de perfil</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6">
            <div className="relative">
              <Avatar className="size-20 border-2 border-emerald-600/30">
                {avatarUrl ? (
                  <AvatarImage src={avatarUrl} alt={displayName} />
                ) : null}
                <AvatarFallback className="bg-emerald-600/15 text-lg font-semibold text-emerald-800">
                  {avatarUrl ? initials : <UserRound className="size-8" />}
                </AvatarFallback>
              </Avatar>
              {isUploading && (
                <div className="absolute inset-0 flex items-center justify-center rounded-full bg-black/40">
                  <Loader2 className="size-6 animate-spin text-white" />
                </div>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                className="hidden"
                onChange={handleAvatarChange}
              />
              <Button
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                disabled={isUploading || isPending}
              >
                <Camera className="mr-2 size-4" />
                {avatarUrl ? 'Cambiar foto' : 'Subir foto'}
              </Button>
              {avatarUrl && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                  onClick={handleRemoveAvatar}
                  disabled={isUploading || isPending}
                >
                  <Trash2 className="mr-2 size-4" />
                  Eliminar foto
                </Button>
              )}
              <p className="text-xs text-muted-foreground">JPG, PNG o WebP. Máximo 2 MB.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Información personal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="displayName">Nombre para mostrar</Label>
            <Input
              id="displayName"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Tu nombre"
              maxLength={100}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={user.email} disabled className="opacity-60" />
            <p className="text-xs text-muted-foreground">
              El email no se puede modificar.
            </p>
          </div>
          <Separator />
          <Button
            onClick={handleSaveProfile}
            disabled={isPending || isUploading || displayName.trim().length < 2}
            className="bg-emerald-600 text-white hover:bg-emerald-500"
          >
            {isPending ? (
              <Loader2 className="mr-2 size-4 animate-spin" />
            ) : (
              <Save className="mr-2 size-4" />
            )}
            Guardar cambios
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
