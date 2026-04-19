import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ZodValidationException } from 'nestjs-zod';
import type { Request, Response } from 'express';
import type { Env } from '../../config/env.validation';

/**
 * Wire format of all error responses returned by the API.
 *
 * Decision: simple custom envelope (NOT RFC 7807) — see plan.
 * Stable shape so the frontend can rely on it.
 */
export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string | string[];
  requestId?: string;
  /** Detailed validation issues (when applicable). */
  details?: unknown;
  /** Stack trace — included only in non-production. */
  stack?: string;
}

interface ZodIssueLike {
  path: (string | number)[];
  message: string;
  code?: string;
}

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  constructor(private readonly config: ConfigService<Env, true>) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { id?: string }>();

    const isProduction =
      this.config.get('NODE_ENV', { infer: true }) === 'production';
    const requestId = request.id;

    const payload = this.buildPayload(exception, requestId, isProduction);

    // Log server errors (5xx) at error level, client errors at debug.
    if (payload.statusCode >= HttpStatus.INTERNAL_SERVER_ERROR) {
      this.logger.error(
        {
          err: exception,
          requestId,
          path: request.url,
          method: request.method,
        },
        'Unhandled exception',
      );
    } else {
      this.logger.debug(
        {
          requestId,
          statusCode: payload.statusCode,
          path: request.url,
          method: request.method,
        },
        payload.error,
      );
    }

    response.status(payload.statusCode).json(payload);
  }

  private buildPayload(
    exception: unknown,
    requestId: string | undefined,
    isProduction: boolean,
  ): ApiErrorResponse {
    // 1) Zod validation errors (from nestjs-zod ZodValidationPipe)
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues: ZodIssueLike[] };
      const issues: ZodIssueLike[] = zodError.issues;
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        error: 'BadRequest',
        message: 'Validation failed',
        details: issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      };
    }

    // 2) Standard NestJS HttpException (and subclasses)
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const res = exception.getResponse();
      const errorName =
        typeof res === 'object' && res !== null && 'error' in res
          ? String((res as { error: unknown }).error)
          : exception.name.replace(/Exception$/, '');
      const message =
        typeof res === 'string'
          ? res
          : typeof res === 'object' && res !== null && 'message' in res
            ? ((res as { message: string | string[] }).message ??
              exception.message)
            : exception.message;
      return {
        statusCode: status,
        error: errorName,
        message,
        requestId,
      };
    }

    // 3) Anything else → 500
    const payload: ApiErrorResponse = {
      statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
      error: 'InternalServerError',
      message: isProduction
        ? 'Internal server error'
        : exception instanceof Error
          ? exception.message
          : String(exception),
      requestId,
    };
    if (!isProduction && exception instanceof Error && exception.stack) {
      payload.stack = exception.stack;
    }
    return payload;
  }
}
