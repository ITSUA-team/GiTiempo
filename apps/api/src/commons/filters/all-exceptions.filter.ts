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
  code?: string;
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

    const payload = this.buildPayload(
      exception,
      request.url,
      requestId,
      isProduction,
    );

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
    requestUrl: string | undefined,
    requestId: string | undefined,
    isProduction: boolean,
  ): ApiErrorResponse {
    // 1) Zod validation errors (from nestjs-zod ZodValidationPipe)
    if (exception instanceof ZodValidationException) {
      const zodError = exception.getZodError() as { issues: ZodIssueLike[] };
      const issues: ZodIssueLike[] = zodError.issues;
      const registrationErrorCode = this.getRegistrationValidationErrorCode(
        requestUrl,
        issues,
      );

      return {
        statusCode: HttpStatus.BAD_REQUEST,
        ...(registrationErrorCode ? { code: registrationErrorCode } : {}),
        error: 'BadRequest',
        message:
          registrationErrorCode === 'weak_password'
            ? 'Choose a stronger password and try again.'
            : registrationErrorCode === 'invalid_workspace_name'
              ? 'Enter a valid workspace name.'
              : 'Validation failed',
        details: issues.map((issue) => ({
          path: issue.path,
          message: issue.message,
          code: issue.code,
        })),
        requestId,
      };
    }

    // 2) Standard NestJS HttpException (and subclasses).
    //
    // Use duck-typing rather than `instanceof HttpException`: in this
    // workspace some third-party Nest modules (e.g. `@nestjs/throttler`
    // at the repo root) resolve `@nestjs/common` from a different
    // directory than `apps/api`, which makes `instanceof` unreliable
    // across module boundaries. Any object that quacks like an
    // HttpException (has `getStatus()` + `getResponse()`) is treated
    // as one.
    if (
      exception instanceof HttpException ||
      (typeof exception === 'object' &&
        exception !== null &&
        typeof (exception as { getStatus?: unknown }).getStatus ===
          'function' &&
        typeof (exception as { getResponse?: unknown }).getResponse ===
          'function')
    ) {
      const httpEx = exception as HttpException;
      const status = httpEx.getStatus();
      const res = httpEx.getResponse();
      const errorName =
        typeof res === 'object' && res !== null && 'error' in res
          ? String((res as { error: unknown }).error)
          : httpEx.name.replace(/Exception$/, '');
      const message =
        typeof res === 'string'
          ? res
          : typeof res === 'object' && res !== null && 'message' in res
            ? ((res as { message: string | string[] }).message ??
              httpEx.message)
            : httpEx.message;
      const code =
        typeof res === 'object' && res !== null && 'code' in res
          ? String((res as { code: unknown }).code)
          : status === HttpStatus.TOO_MANY_REQUESTS &&
              requestUrl === '/auth/register'
            ? 'rate_limited'
            : undefined;
      return {
        statusCode: status,
        ...(code ? { code } : {}),
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

  private getRegistrationValidationErrorCode(
    requestUrl: string | undefined,
    issues: ZodIssueLike[],
  ): 'weak_password' | 'invalid_workspace_name' | null {
    if (requestUrl !== '/auth/register') {
      return null;
    }

    const issuePaths = issues.map((issue) => issue.path[0]);
    if (
      issuePaths.length > 0 &&
      issuePaths.every((path) => path === 'password')
    ) {
      return 'weak_password';
    }
    if (
      issuePaths.length > 0 &&
      issuePaths.every((path) => path === 'workspaceName')
    ) {
      return 'invalid_workspace_name';
    }

    return null;
  }
}
