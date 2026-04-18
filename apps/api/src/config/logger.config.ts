import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { Env } from './env.validation';

/**
 * Pre-configured LoggerModule using nestjs-pino.
 *
 * - Development: pino-pretty with colorized single-line output
 * - Production: structured JSON logs
 * - Redacts authorization / cookie headers
 * - Silences /commons/health auto-logging
 */
export const LoggerModuleConfig = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => {
    const nodeEnv = config.get('NODE_ENV', { infer: true });
    const level = config.get('LOG_LEVEL', { infer: true });
    const isDev = nodeEnv === 'development';

    return {
      pinoHttp: {
        level,
        ...(isDev
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: true,
                  translateTime: 'HH:MM:ss.l',
                  ignore: 'pid,hostname',
                },
              },
            }
          : {}),
        redact: {
          paths: ['req.headers.authorization', 'req.headers.cookie'],
          censor: '[REDACTED]',
        },
        autoLogging: {
          ignore: (req: { url?: string }) =>
            req.url === '/commons/health',
        },
      },
    };
  },
});
