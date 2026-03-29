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
        <TabsList className="grid h-auto w-full grid-cols-1 gap-2 bg-emerald-950/5 p-2 sm:grid-cols-3">
          <TabsTrigger
            value="groups"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Fase de Grupos
          </TabsTrigger>
          <TabsTrigger
            value="knockout"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
          >
            Eliminatorias
          </TabsTrigger>
          <TabsTrigger
            value="specials"
            className="data-[state=active]:bg-emerald-600 data-[state=active]:text-white"
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

      <div className="border-emerald-950/10 flex flex-col gap-2 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-muted-foreground text-sm">
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
