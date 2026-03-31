'use client';

import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { FixtureGroupPhasePlaceholder } from '@/components/fixture/FixtureGroupPhasePlaceholder';
import { FixtureKnockoutPlaceholder } from '@/components/fixture/FixtureKnockoutPlaceholder';
import { FixtureSpecialsPlaceholder } from '@/components/fixture/FixtureSpecialsPlaceholder';
import { Save } from 'lucide-react';

interface FixturePredictionTabsProps {
  saveDisabled: boolean;
  saveDisabledReason?: string;
}

export const FixturePredictionTabs = ({
  saveDisabled,
  saveDisabledReason,
}: FixturePredictionTabsProps) => {
  return (
    <div className="space-y-6">
      <Tabs defaultValue="groups" className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 border border-zinc-800/80 bg-zinc-900/50 p-2 sm:grid-cols-3">
          <TabsTrigger
            value="groups"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Fase de Grupos
          </TabsTrigger>
          <TabsTrigger
            value="knockout"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Eliminatorias
          </TabsTrigger>
          <TabsTrigger
            value="specials"
            className="text-zinc-300 data-[state=active]:bg-emerald-600 data-[state=active]:text-white data-[state=active]:shadow-sm"
          >
            Predicciones Especiales
          </TabsTrigger>
        </TabsList>
        <TabsContent value="groups" className="mt-4">
          <FixtureGroupPhasePlaceholder />
        </TabsContent>
        <TabsContent value="knockout" className="mt-4">
          <FixtureKnockoutPlaceholder />
        </TabsContent>
        <TabsContent value="specials" className="mt-4">
          <FixtureSpecialsPlaceholder />
        </TabsContent>
      </Tabs>

      <div className="flex flex-col gap-2 border-t border-zinc-800/80 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-400">
          {saveDisabled && saveDisabledReason ? saveDisabledReason : 'Guardá cuando termines de cargar el fixture.'}
        </p>
        <Button
          type="button"
          size="lg"
          disabled={saveDisabled}
          className="bg-emerald-600 text-white hover:bg-emerald-600/90"
        >
          <Save className="mr-2 size-4" />
          Guardar predicción
        </Button>
      </div>
    </div>
  );
};
