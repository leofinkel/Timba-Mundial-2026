import { z } from 'zod';

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
});

export const registerSchema = z
  .object({
    email: z.string().email('Email inválido'),
    password: z.string().min(6, 'Mínimo 6 caracteres'),
    confirmPassword: z.string().min(6, 'Mínimo 6 caracteres'),
    firstName: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
    lastName: z.string().min(2, 'Mínimo 2 caracteres').max(50, 'Máximo 50 caracteres'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export const groupMatchPredictionSchema = z.object({
  matchId: z.string().min(1),
  homeGoals: z.number().int().min(0).max(99).nullable(),
  awayGoals: z.number().int().min(0).max(99).nullable(),
});

export const knockoutMatchPredictionSchema = z.object({
  matchId: z.string().min(1),
  homeTeamId: z.string(),
  awayTeamId: z.string(),
  homeGoals: z.number().int().min(0).max(99),
  awayGoals: z.number().int().min(0).max(99),
  winnerId: z.string(),
});

const specialPredictionNameSchema = z
  .string()
  .max(200, 'Máximo 200 caracteres');

export const savePredictionsSchema = z.object({
  groupPredictions: z.array(groupMatchPredictionSchema),
  knockoutPredictions: z.array(knockoutMatchPredictionSchema).optional(),
  specialPredictions: z.object({
    topScorer: specialPredictionNameSchema,
    bestPlayer: specialPredictionNameSchema,
  }),
  /** Orden 1–4 por grupo (IDs de equipo); se guarda con la tabla mostrada al usuario. */
  groupStandingsByGroup: z.record(z.string(), z.array(z.string().min(1))).optional(),
});

export const saveSpecialPredictionsSchema = z.object({
  topScorer: specialPredictionNameSchema,
  bestPlayer: specialPredictionNameSchema,
});

export const targetUserIdSchema = z.string().uuid('Usuario inválido');

export const saveSpecialResultsSchema = z.object({
  championTeamId: z.string().min(1),
  runnerUpTeamId: z.string().min(1),
  thirdPlaceTeamId: z.string().min(1),
  fourthPlaceTeamId: z.string().min(1),
  topScorer: z.string().min(1),
  bestPlayer: z.string().min(1),
});

export const updateProfileSchema = z.object({
  displayName: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(100, 'Máximo 100 caracteres'),
});

export const adminResultSchema = z.object({
  matchId: z.string().min(1),
  homeGoals: z.number().int().min(0),
  awayGoals: z.number().int().min(0),
});

export const knockoutResultSchema = z.object({
  matchId: z.string().min(1),
  winnerTeamId: z.string().min(1),
});

export const clearMatchResultSchema = z.object({
  matchId: z.string().min(1),
});

export const paymentStatusUpdateSchema = z.enum(['pending', 'paid']);

export const adminGameRuleSchema = z.object({
  title: z.string().min(3, 'Título demasiado corto').max(120, 'Título demasiado largo'),
  content: z.string().min(10, 'Contenido demasiado corto'),
  sortOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const adminMatchSchema = z.object({
  stage: z.string().min(1),
  groupId: z.string().nullable().optional(),
  matchNumber: z.number().int().min(1),
  matchday: z.number().int().min(1).max(3).nullable().optional(),
  homeTeamId: z.string().nullable().optional(),
  awayTeamId: z.string().nullable().optional(),
  homeSource: z.string().max(120).nullable().optional(),
  awaySource: z.string().max(120).nullable().optional(),
  playedAt: z.string().datetime().nullable().optional(),
});

export const adminClassificationUpdateSchema = z.object({
  userId: z.string().uuid(),
  totalPoints: z.number().int().min(0),
  rank: z.number().int().min(1).nullable().optional(),
});

export const adminNewsPostSchema = z.object({
  title: z.string().min(3, 'Título demasiado corto').max(200, 'Título demasiado largo'),
  body: z.string().min(5, 'Contenido demasiado corto').max(5000, 'Contenido demasiado largo'),
});

export const adminNewsPostUpdateSchema = z.object({
  title: z.string().min(3, 'Título demasiado corto').max(200, 'Título demasiado largo'),
  body: z.string().min(5, 'Contenido demasiado corto').max(5000, 'Contenido demasiado largo'),
  isVisible: z.boolean(),
});

export type LoginSchemaInferred = z.infer<typeof loginSchema>;
export type RegisterSchemaInferred = z.infer<typeof registerSchema>;
export type GroupMatchPredictionSchemaInferred = z.infer<typeof groupMatchPredictionSchema>;
export type SavePredictionsSchemaInferred = z.infer<typeof savePredictionsSchema>;
export type KnockoutMatchPredictionSchemaInferred = z.infer<
  typeof knockoutMatchPredictionSchema
>;
export type SaveSpecialPredictionsSchemaInferred = z.infer<typeof saveSpecialPredictionsSchema>;
export type SaveSpecialResultsSchemaInferred = z.infer<typeof saveSpecialResultsSchema>;
export type AdminResultSchemaInferred = z.infer<typeof adminResultSchema>;
export type KnockoutResultSchemaInferred = z.infer<typeof knockoutResultSchema>;
export type AdminGameRuleSchemaInferred = z.infer<typeof adminGameRuleSchema>;
export type AdminMatchSchemaInferred = z.infer<typeof adminMatchSchema>;
export type AdminClassificationUpdateSchemaInferred = z.infer<
  typeof adminClassificationUpdateSchema
>;
export type AdminNewsPostSchemaInferred = z.infer<typeof adminNewsPostSchema>;
export type AdminNewsPostUpdateSchemaInferred = z.infer<typeof adminNewsPostUpdateSchema>;
