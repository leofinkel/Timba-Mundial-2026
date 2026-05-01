export const BUENOS_AIRES_TIME_ZONE = 'America/Argentina/Buenos_Aires' as const;
export const BUENOS_AIRES_TIME_ZONE_LABEL = 'UTC-3 (Buenos Aires)' as const;

const getDate = (value: Date | string): Date => (value instanceof Date ? value : new Date(value));

export const formatBuenosAiresDate = (value: Date | string): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(getDate(value));

export const formatBuenosAiresDateTime = (value: Date | string): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(getDate(value));

export const formatBuenosAiresDeadline = (value: Date | string): string =>
  new Intl.DateTimeFormat('es-AR', {
    timeZone: BUENOS_AIRES_TIME_ZONE,
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(getDate(value));
