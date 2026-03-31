-- Timba Mundial 2026 - Initial seed data
-- Run after supabase/schema.sql

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.game_rules) THEN
    INSERT INTO public.game_rules (title, content, sort_order, is_active)
    VALUES
      (
        'Fase de Grupos',
        E'Acierto de ganador o empate: 1 punto por partido (72 partidos de fase de grupos).\nAcierto de resultado exacto: +5 puntos extra por partido.\nPosiciones finales del grupo: 5 puntos por cada equipo en su posicion correcta.',
        10,
        true
      ),
      (
        'Condiciones de Guardado',
        E'La fecha limite de guardado es el 25 de mayo de 2026; despues se bloquea el formulario.\nGoleador del Mundial y Figura del Mundial son campos obligatorios para finalizar el guardado.',
        20,
        true
      ),
      (
        'Eliminatorias',
        E'Dieciseisavos de final: 10 puntos por equipo clasificado acertado.\nOctavos de final: 20 puntos por equipo clasificado acertado.\nCuartos de final: 35 puntos por equipo clasificado acertado.\nSemifinales: 50 puntos por equipo clasificado acertado.\nFinalistas: 100 puntos por equipo clasificado acertado.',
        30,
        true
      ),
      (
        'Cuadro de Honor',
        E'Campeon: 180 puntos.\nSubcampeon: 100 puntos.\nTercer puesto: 100 puntos.\nCuarto puesto: 100 puntos.\nGoleador del Mundial: 100 puntos.\nFigura del Mundial: 100 puntos.',
        40,
        true
      ),
      (
        'Premios',
        E'1.er puesto: 70% del pozo acumulado.\n2.o puesto: 20% del pozo acumulado.\n3.er puesto: 10% del pozo acumulado.',
        50,
        true
      );
  END IF;
END $$;
