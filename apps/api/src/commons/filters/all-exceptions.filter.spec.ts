import {
  BadRequestException,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { DomainError } from '../errors/domain-error';
import { AllExceptionsFilter } from './all-exceptions.filter';

interface TestRequest {
  id: string;
  method: string;
  path: string;
  url: string;
}

function createResponse() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

function createRequest(overrides: Partial<TestRequest> = {}): TestRequest {
  return {
    id: 'request-1',
    method: 'GET',
    path: '/test',
    url: '/test',
    ...overrides,
  };
}

function createHost(
  request: TestRequest,
  response: ReturnType<typeof createResponse>,
) {
  return {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => response,
    }),
  };
}

function createFilter(nodeEnv = 'test'): AllExceptionsFilter {
  return new AllExceptionsFilter({
    get: vi.fn().mockReturnValue(nodeEnv),
  } as never as ConfigService<never, true>);
}

describe('AllExceptionsFilter', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('preserves typed recovery payloads in normalized HttpException envelopes', () => {
    const response = createResponse();
    const request = createRequest({
      method: 'POST',
      path: '/workspace/github/organizations',
      url: '/workspace/github/organizations',
    });
    const host = createHost(request, response);
    const filter = createFilter();

    filter.catch(
      new BadRequestException({
        code: 'workspace_github_organization_connection_required',
        error: 'BadRequest',
        message: 'Connect GitHub before adding an allowed organization',
        recovery: {
          organizationLogin: 'octo-org',
          reason: 'workspace_github_organization_connection_required',
          steps: [
            { id: 'install', status: 'unknown' },
            { id: 'approve', status: 'action_required' },
            { id: 'reconnect', status: 'disconnected' },
            { id: 'retry', status: 'blocked' },
          ],
        },
      }),
      host as never,
    );

    expect(response.status).toHaveBeenCalledWith(400);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 400,
      code: 'workspace_github_organization_connection_required',
      error: 'BadRequest',
      message: 'Connect GitHub before adding an allowed organization',
      recovery: {
        organizationLogin: 'octo-org',
        reason: 'workspace_github_organization_connection_required',
        steps: [
          { id: 'install', status: 'unknown' },
          { id: 'approve', status: 'action_required' },
          { id: 'reconnect', status: 'disconnected' },
          { id: 'retry', status: 'blocked' },
        ],
      },
      requestId: 'request-1',
    });
  });

  it('masks internal DomainError payloads in production', () => {
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const response = createResponse();
    const host = createHost(createRequest(), response);
    const filter = createFilter('production');
    const exception = DomainError.internal(
      'invalid_duration_config',
      'Invalid duration: "JWT_ACCESS_TTL"',
    );

    filter.catch(exception, host as never);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
      requestId: 'request-1',
    });
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: exception,
        requestId: 'request-1',
        path: '/test',
        method: 'GET',
      }),
      'Unhandled exception',
    );
  });

  it('labels intentional HttpException 5xx as server error response, not unhandled', () => {
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const response = createResponse();
    const host = createHost(createRequest(), response);
    const filter = createFilter('production');

    const exception = new ServiceUnavailableException(
      'GitHub API request failed',
    );
    filter.catch(exception, host as never);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 503,
      error: 'InternalServerError',
      message: 'Internal server error',
      requestId: 'request-1',
    });
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: exception,
        requestId: 'request-1',
      }),
      'Server error response',
    );
  });

  it('handles duck-typed HttpException 5xx with server error response label', () => {
    const loggerError = vi
      .spyOn(Logger.prototype, 'error')
      .mockImplementation(() => undefined);
    const response = createResponse();
    const host = createHost(createRequest(), response);
    const filter = createFilter('production');

    const duckTyped = {
      getStatus: () => 503,
      getResponse: () => ({
        message: 'GitHub API request failed',
        error: 'Service Unavailable',
      }),
      name: 'ServiceUnavailableException',
    };
    filter.catch(duckTyped, host as never);

    expect(response.status).toHaveBeenCalledWith(503);
    expect(loggerError).toHaveBeenCalledWith(
      expect.objectContaining({
        err: duckTyped,
        requestId: 'request-1',
      }),
      'Server error response',
    );
  });

  it('keeps generic errors masked in production', () => {
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
    const response = createResponse();
    const host = createHost(createRequest(), response);
    const filter = createFilter('production');

    filter.catch(new Error('private database detail'), host as never);

    expect(response.status).toHaveBeenCalledWith(500);
    expect(response.json).toHaveBeenCalledWith({
      statusCode: 500,
      error: 'InternalServerError',
      message: 'Internal server error',
      requestId: 'request-1',
    });
  });
});
