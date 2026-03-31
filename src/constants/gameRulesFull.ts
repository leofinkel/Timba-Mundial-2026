export const GROUP_STAGE_RULES = [
  'Acierto de ganador o empate: 1 punto por partido (72 partidos de fase de grupos).',
  'Acierto de resultado exacto: +5 puntos extra por partido.',
  'Posiciones finales del grupo: 5 puntos por cada equipo en su posición correcta.',
] as const;

export const KNOCKOUT_CLASSIFICATION_POINTS = [
  { stage: 'Dieciseisavos de final', points: 10 },
  { stage: 'Octavos de final', points: 20 },
  { stage: 'Cuartos de final', points: 35 },
  { stage: 'Semifinales', points: 50 },
  { stage: 'Finalistas', points: 100 },
] as const;

export const FINAL_AWARDS_POINTS = [
  { category: 'Campeón', points: 180 },
  { category: 'Subcampeón', points: 100 },
  { category: 'Tercer puesto', points: 100 },
  { category: 'Cuarto puesto', points: 100 },
  { category: 'Goleador del Mundial', points: 100 },
  { category: 'Figura del Mundial', points: 100 },
] as const;

export const SAVE_CONDITIONS = [
  'La fecha límite de guardado es el 25 de mayo de 2026; después se bloquea el formulario.',
  'Goleador del Mundial y Figura del Mundial son campos obligatorios para finalizar el guardado.',
] as const;

export const PRIZE_DISTRIBUTION = [
  { position: '1º puesto', percent: '70%' },
  { position: '2º puesto', percent: '20%' },
  { position: '3º puesto', percent: '10%' },
] as const;

