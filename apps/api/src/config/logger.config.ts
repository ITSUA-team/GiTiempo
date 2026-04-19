import { randomUUID } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { LoggerModule } from 'nestjs-pino';
import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Env } from './env.validation';

const REQUEST_ID_HEADER = 'x-request-id';

function compactReqSerializer(req: IncomingMessage & { id?: string }) {
  return {
    method: req.method,
    url: req.url,
    ...(req.id ? { id: req.id } : {}),
  };
}

function compactResSerializer(res: ServerResponse) {
  return {
    statusCode: res.statusCode,
  };
}

export const LoggerModuleConfig = LoggerModule.forRootAsync({
  inject: [ConfigService],
  useFactory: (config: ConfigService<Env, true>) => {
    const nodeEnv = config.get('NODE_ENV', { infer: true });
    const level = config.get('LOG_LEVEL', { infer: true });
    const isDev = nodeEnv === 'development';
    const extended = config.get('LOG_EXTENDED', { infer: true });

    return {
      pinoHttp: {
        level,
        genReqId: (req: IncomingMessage, res: ServerResponse) => {
          const incoming = req.headers[REQUEST_ID_HEADER];
          const id =
            (Array.isArray(incoming) ? incoming[0] : incoming) ?? randomUUID();
          res.setHeader(REQUEST_ID_HEADER, id);
          return id;
        },
        customProps: (req) => ({
          requestId: (req as { id?: string }).id,
        }),
        ...(extended
          ? {}
          : {
              serializers: {
                req: compactReqSerializer,
                res: compactResSerializer,
              } as const,
            }),
        ...(isDev
          ? {
              transport: {
                target: 'pino-pretty',
                options: {
                  colorize: true,
                  singleLine: !extended,
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
            req.url === '/commons/health' ||
            req.url === '/commons/health/live' ||
            req.url === '/commons/health/ready',
        },
      },
    };
  },
});
