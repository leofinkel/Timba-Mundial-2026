/** Public object URL for Supabase Storage (works in server and client with NEXT_PUBLIC_SUPABASE_URL). */
export const getStoragePublicObjectUrl = (bucket: string, objectPath: string): string => {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!base) {
    return '';
  }
  const pathNorm = objectPath.split('/').filter(Boolean).map(encodeURIComponent).join('/');
  return `${base}/storage/v1/object/public/${bucket}/${pathNorm}`;
};
