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
  homeGoals: z.number().int().min(0).max(99),
  awayGoals: z.number().int().min(0).max(99),
});

export const knockoutMatchPredictionSchema = z.object({
  matchId: z.string().min(1),
  homeTeamId: z.string().min(1),
  awayTeamId: z.string().min(1),
  homeGoals: z.number().int().min(0).max(99),
  awayGoals: z.number().int().min(0).max(99),
  winnerId: z.string().min(1),
});

export const savePredictionsSchema = z.object({
  groupPredictions: z.array(groupMatchPredictionSchema),
  knockoutPredictions: z.array(knockoutMatchPredictionSchema).optional(),
  specialPredictions: z.object({
    topScorer: z.string().min(2),
    bestPlayer: z.string().min(2),
  }),
});

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

export type LoginSchemaInferred = z.infer<typeof loginSchema>;
export type RegisterSchemaInferred = z.infer<typeof registerSchema>;
export type GroupMatchPredictionSchemaInferred = z.infer<typeof groupMatchPredictionSchema>;
export type SavePredictionsSchemaInferred = z.infer<typeof savePredictionsSchema>;
export type KnockoutMatchPredictionSchemaInferred = z.infer<
  typeof knockoutMatchPredictionSchema
>;
export type SaveSpecialResultsSchemaInferred = z.infer<typeof saveSpecialResultsSchema>;
export type AdminResultSchemaInferred = z.infer<typeof adminResultSchema>;
export type AdminGameRuleSchemaInferred = z.infer<typeof adminGameRuleSchema>;
export type AdminMatchSchemaInferred = z.infer<typeof adminMatchSchema>;
export type AdminClassificationUpdateSchemaInferred = z.infer<
  typeof adminClassificationUpdateSchema
>;
export type AdminNewsPostSchemaInferred = z.infer<typeof adminNewsPostSchema>;
