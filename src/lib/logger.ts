import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseLogger = pino({
  level: isDevelopment ? 'debug' : 'info',
  ...(isDevelopment
    ? {
        transport: {
          target: 'pino-pretty',
          options: {
            colorize: true,
          },
        },
      }
    : {}),
});

export const createApiLogger = (route: string) => baseLogger.child({ route });

export const createServiceLogger = (service: string) => baseLogger.child({ service });
