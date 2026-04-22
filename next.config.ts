import type { NextConfig } from 'next';

const allowedDevOrigins = (process.env.NEXT_ALLOWED_DEV_ORIGINS ?? '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);

/**
 * next/image `hostname: '**'` is not a reliable allowlist for all Next versions. Supabase public
 * storage URLs must match a concrete host + pathname.
 */
const supabaseStorageRemotePatterns = () => {
  const raw = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!raw) {
    return [];
  }
  try {
    const u = new URL(raw);
    if (u.protocol !== 'https:' && u.protocol !== 'http:') {
      return [];
    }
    const base = {
      protocol: (u.protocol === 'https:' ? 'https' : 'http') as 'https' | 'http',
      hostname: u.hostname,
      pathname: '/storage/v1/object/public/**',
    };
    if (u.port && u.port !== '80' && u.port !== '443') {
      return [{ ...base, port: u.port }];
    }
    return [base];
  } catch {
    return [];
  }
};

const nextConfig: NextConfig = {
  ...(allowedDevOrigins.length > 0 ? { allowedDevOrigins } : {}),
  images: {
    remotePatterns: [
      ...supabaseStorageRemotePatterns(),
      {
        protocol: 'https',
        hostname: '**',
      },
    ],
  },
};

export default nextConfig;
