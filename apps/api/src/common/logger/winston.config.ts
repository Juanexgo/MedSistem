import { WinstonModule, utilities as nestWinstonUtilities } from 'nest-winston';
import * as winston from 'winston';

const { format, transports } = winston;

function buildFormat(isProd: boolean): winston.Logform.Format {
  const base = format.combine(
    format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss.SSS' }),
    format.errors({ stack: true }),
  );
  if (isProd) {
    return format.combine(base, format.json());
  }
  return format.combine(
    base,
    nestWinstonUtilities.format.nestLike('MediFlow', {
      prettyPrint: true,
      colors: true,
    }),
  );
}

export function createWinstonLogger() {
  const isProd = process.env.NODE_ENV === 'production';
  const level = process.env.LOG_LEVEL || (isProd ? 'info' : 'debug');

  const fileTransports: winston.transport[] = isProd
    ? [
        new transports.File({
          filename: 'logs/error.log',
          level: 'error',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
        }),
        new transports.File({
          filename: 'logs/combined.log',
          maxsize: 10 * 1024 * 1024,
          maxFiles: 10,
        }),
      ]
    : [];

  return WinstonModule.createLogger({
    level,
    format: buildFormat(isProd),
    transports: [new transports.Console(), ...fileTransports],
    exitOnError: false,
  });
}
