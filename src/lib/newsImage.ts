export const NEWS_IMAGE_MAX_BYTES = 2 * 1024 * 1024;

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export const ALLOWED_NEWS_IMAGE_MIMES = Object.keys(MIME_TO_EXT) as string[];

export const validateNewsImageFile = (
  file: File,
):
  | { ok: true; ext: string }
  | { ok: false; error: string } => {
  if (!ALLOWED_NEWS_IMAGE_MIMES.includes(file.type)) {
    return { ok: false, error: 'Formato no permitido. Usá JPG, PNG o WebP' };
  }
  if (file.size > NEWS_IMAGE_MAX_BYTES) {
    return { ok: false, error: 'La imagen no puede superar 2 MB' };
  }
  const ext = MIME_TO_EXT[file.type];
  if (!ext) {
    return { ok: false, error: 'Formato de imagen no soportado' };
  }
  return { ok: true, ext };
};
