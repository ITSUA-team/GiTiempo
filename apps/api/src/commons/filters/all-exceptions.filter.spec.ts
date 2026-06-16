import { ArgumentsHost, Logger, NotFoundException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createFilter() {
  return new AllExceptionsFilter();
}

function createHost() {
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const request = {
    id: 'request-1',
    method: 'GET',
    url: '/github/connection',
  };
  const host = {
    switchToHttp: () => ({
      getRequest: () => request,
      getResponse: () => ({ status }),
    }),
  } as ArgumentsHost;

  return { host, json, status };
}

describe('AllExceptionsFilter', () => {
  beforeEach(() => {
    vi.spyOn(Logger.prototype, 'debug').mockImplementation(() => undefined);
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => undefined);
  });

  it('does not expose raw unexpected error messages in 500 responses', () => {
    const filter = createFilter();
    const { host, json, status } = createHost();
    const errorSpy = vi.spyOn(Logger.prototype, 'error');

    filter.catch(
      Object.assign(
        new Error(
          'Failed query: select "access_token_encrypted" from "github_connections" params: secret-token',
        ),
        { name: 'DrizzleQueryError' },
      ),
      host,
    );

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({
      error: 'InternalServerError',
      message: 'Internal server error',
      requestId: 'request-1',
      statusCode: 500,
    });
    expect(errorSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        err: {
          message: 'Internal server error',
          type: 'DrizzleQueryError',
        },
      }),
      'Unhandled exception',
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('Failed query');
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain(
      'github_connections',
    );
    expect(JSON.stringify(errorSpy.mock.calls)).not.toContain('secret-token');
  });

  it('preserves expected HTTP exception messages', () => {
    const filter = createFilter();
    const { host, json, status } = createHost();

    filter.catch(new NotFoundException('GitHub connection not found'), host);

    expect(status).toHaveBeenCalledWith(404);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: 'Not Found',
        message: 'GitHub connection not found',
        requestId: 'request-1',
        statusCode: 404,
      }),
    );
  });
});
