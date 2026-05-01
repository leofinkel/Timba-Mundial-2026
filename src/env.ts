import { z } from 'zod';

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_URL is required'),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'NEXT_PUBLIC_SUPABASE_ANON_KEY is required'),
});

const parsedPublicEnv = publicEnvSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
});

if (!parsedPublicEnv.success) {
  const message = parsedPublicEnv.error.issues.map((i) => i.message).join('; ');
  throw new Error(`Invalid environment: ${message}`);
}

const serviceRoleSchema = z
  .string()
  .min(1, 'SUPABASE_SERVICE_ROLE_KEY is required')
  .transform((v) => v.trim());

export const env = parsedPublicEnv.data;

export const getServiceRoleKey = () => {
  const parsedServiceRole = serviceRoleSchema.safeParse(process.env.SUPABASE_SERVICE_ROLE_KEY);
  if (!parsedServiceRole.success) {
    const message = parsedServiceRole.error.issues.map((i) => i.message).join('; ');
    throw new Error(`Invalid environment: ${message}`);
  }
  return parsedServiceRole.data;
};

export type Env = z.infer<typeof publicEnvSchema>;
