import { z } from 'zod';

const isLikelyJwt = (value: string) => value.split('.').length === 3;

const hasServiceRoleClaim = (value: string) => {
  if (!isLikelyJwt(value)) {
    return false;
  }
  try {
    const payload = value.split('.')[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = Buffer.from(normalized, 'base64').toString('utf-8');
    const parsed = JSON.parse(decoded) as { role?: unknown };
    return parsed.role === 'service_role';
  } catch {
    return false;
  }
};

const envSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
  SUPABASE_SERVICE_ROLE_KEY: z
    .string()
    .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
    .refine(
      (value) => value.startsWith('sb_secret_') || hasServiceRoleClaim(value),
      'SUPABASE_SERVICE_ROLE_KEY must be a Supabase secret key (sb_secret_...) or a JWT with role=service_role',
    ),
});

const parsed = envSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
});

if (!parsed.success) {
  const message = parsed.error.issues.map((i) => i.message).join('; ');
  throw new Error(`Invalid environment: ${message}`);
}

export const env = parsed.data;

export type Env = z.infer<typeof envSchema>;
