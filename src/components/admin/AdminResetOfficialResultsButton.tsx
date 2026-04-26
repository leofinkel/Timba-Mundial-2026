'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import { resetAllOfficialResultsAction } from '@/actions/results';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

const CONFIRM_PHRASE = 'BORRAR TODO';

export const AdminResetOfficialResultsButton = () => {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [phrase, setPhrase] = useState('');
  const [pending, setPending] = useState(false);

  const close = () => {
    setOpen(false);
    setStep(1);
    setPhrase('');
    setPending(false);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) close();
    else setOpen(true);
  };

  const handleConfirm = async () => {
    if (step === 1) {
      setStep(2);
      return;
    }
    if (phrase.trim() !== CONFIRM_PHRASE) {
      toast.error(`Escribí exactamente: ${CONFIRM_PHRASE}`);
      return;
    }
    setPending(true);
    const res = await resetAllOfficialResultsAction();
    setPending(false);
    if (res.success) {
      toast.success('Se borraron los resultados oficiales y se recalculó el ranking a cero.');
      close();
      router.refresh();
      return;
    }
    toast.error(
      res.error === 'Forbidden' ? 'No tenés permiso.' : res.error,
    );
  };

  return (
    <>
      <div className="flex flex-col gap-2 rounded-lg border border-red-900/50 bg-red-950/20 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-zinc-300">
          <span className="font-medium text-red-200">Zona peligrosa.</span> Quita goles, ganadores
          y posiciones de todos los partidos, vacía especiales (campeón, goleador, etc.),
          restablece las llaves (16avos en adelante) y pone en cero el puntaje de todos los
          usuarios. No borra planillas.
        </p>
        <Button
          type="button"
          variant="destructive"
          className="shrink-0"
          onClick={() => {
            setOpen(true);
            setStep(1);
            setPhrase('');
          }}
        >
          Reset de resultados y puntos
        </Button>
      </div>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent className="border-zinc-800/80 bg-zinc-950 text-zinc-50 sm:max-w-md">
          {step === 1 ? (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">¿Borrar todos los resultados oficiales?</DialogTitle>
                <DialogDescription className="text-zinc-400">
                  Se limpiarán resultados de partidos, datos especiales y puntajes. Las planillas
                  de los jugadores se mantienen. Esta acción no se puede deshacer.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button type="button" variant="secondary" onClick={close} className="bg-zinc-800 text-zinc-100">
                  Cancelar
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirm}>
                  Continuar
                </Button>
              </DialogFooter>
            </>
          ) : (
            <>
              <DialogHeader>
                <DialogTitle className="text-white">Confirmación final</DialogTitle>
                <div className="space-y-3">
                  <DialogDescription className="text-zinc-400">
                    Escribí <span className="font-mono text-red-200">{CONFIRM_PHRASE}</span> para
                    confirmar.
                  </DialogDescription>
                  <div className="space-y-1.5">
                    <Label htmlFor="reset-phrase" className="text-zinc-300">
                      Frase
                    </Label>
                    <Input
                      id="reset-phrase"
                      autoComplete="off"
                      value={phrase}
                      onChange={(e) => setPhrase(e.target.value)}
                      className="border-zinc-700 bg-zinc-900 text-white"
                      placeholder={CONFIRM_PHRASE}
                    />
                  </div>
                </div>
              </DialogHeader>
              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setStep(1)}
                  className="bg-zinc-800 text-zinc-100"
                >
                  Atrás
                </Button>
                <Button type="button" variant="destructive" onClick={handleConfirm} disabled={pending}>
                  {pending ? 'Borrando…' : 'Borrar definitivamente'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
};
