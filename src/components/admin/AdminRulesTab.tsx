'use client';

import { useState, useTransition } from 'react';
import { toast } from 'sonner';

import {
  createGameRuleAction,
  deleteGameRuleAction,
  updateGameRuleAction,
} from '@/actions/admin';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import type { AdminGameRule } from '@/types/admin';

interface AdminRulesTabProps {
  rules: AdminGameRule[];
}

export const AdminRulesTab = ({ rules }: AdminRulesTabProps) => {
  const [pending, startTransition] = useTransition();

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [isActive, setIsActive] = useState(true);

  const createRule = () => {
    const order = Number.parseInt(sortOrder, 10);
    if (!title.trim() || !content.trim() || Number.isNaN(order)) {
      toast.error('Completá título, contenido y orden válido');
      return;
    }

    startTransition(async () => {
      const res = await createGameRuleAction({
        title: title.trim(),
        content: content.trim(),
        sortOrder: order,
        isActive,
      });

      if (!res.success) {
        toast.error(res.error);
        return;
      }

      toast.success('Regla creada');
      setTitle('');
      setContent('');
      setSortOrder('0');
      setIsActive(true);
    });
  };

  const updateRule = (rule: AdminGameRule) => {
    startTransition(async () => {
      const res = await updateGameRuleAction(rule.id, {
        title: rule.title,
        content: rule.content,
        sortOrder: rule.sortOrder,
        isActive: rule.isActive,
      });
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Regla actualizada');
    });
  };

  const removeRule = (id: string) => {
    startTransition(async () => {
      const res = await deleteGameRuleAction(id);
      if (!res.success) {
        toast.error(res.error);
        return;
      }
      toast.success('Regla eliminada');
    });
  };

  return (
    <div className="space-y-6">
      <Card className="border-emerald-950/10 shadow-md">
        <CardHeader>
          <CardTitle>Crear regla</CardTitle>
          <CardDescription>ABM de reglamento completo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="new-rule-title">Título</Label>
              <Input
                id="new-rule-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej: Fase de grupos"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-rule-order">Orden</Label>
              <Input
                id="new-rule-order"
                type="number"
                min={0}
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
              />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-rule-content">Contenido</Label>
            <Textarea
              id="new-rule-content"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={5}
              placeholder="Texto completo del reglamento para esta sección..."
            />
          </div>
          <div className="flex items-center gap-2">
            <Switch checked={isActive} onCheckedChange={setIsActive} />
            <Label>Activo</Label>
          </div>
          <Button
            type="button"
            className="bg-emerald-600 text-white hover:bg-emerald-600/90"
            disabled={pending}
            onClick={createRule}
          >
            Crear regla
          </Button>
        </CardContent>
      </Card>

      {rules.length === 0 ? (
        <p className="text-muted-foreground text-sm">No hay reglas creadas todavía.</p>
      ) : (
        <div className="space-y-4">
          {rules.map((rule) => (
            <RuleEditorCard
              key={rule.id}
              rule={rule}
              pending={pending}
              onSave={updateRule}
              onDelete={removeRule}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface RuleEditorCardProps {
  rule: AdminGameRule;
  pending: boolean;
  onSave: (rule: AdminGameRule) => void;
  onDelete: (id: string) => void;
}

const RuleEditorCard = ({ rule, pending, onSave, onDelete }: RuleEditorCardProps) => {
  const [local, setLocal] = useState(rule);
  return (
    <Card className="border-emerald-950/10 shadow-sm">
      <CardHeader>
        <CardTitle className="text-base">Regla #{rule.sortOrder}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-3 sm:grid-cols-2">
          <Input
            value={local.title}
            onChange={(e) => setLocal((prev) => ({ ...prev, title: e.target.value }))}
          />
          <Input
            type="number"
            min={0}
            value={local.sortOrder}
            onChange={(e) =>
              setLocal((prev) => ({
                ...prev,
                sortOrder: Number.parseInt(e.target.value || '0', 10),
              }))
            }
          />
        </div>
        <Textarea
          rows={4}
          value={local.content}
          onChange={(e) => setLocal((prev) => ({ ...prev, content: e.target.value }))}
        />
        <div className="flex items-center gap-2">
          <Switch
            checked={local.isActive}
            onCheckedChange={(checked) => setLocal((prev) => ({ ...prev, isActive: checked }))}
          />
          <Label>Activo</Label>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="secondary"
            disabled={pending}
            onClick={() => onSave(local)}
          >
            Guardar cambios
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={pending}
            onClick={() => onDelete(local.id)}
          >
            Eliminar
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};
