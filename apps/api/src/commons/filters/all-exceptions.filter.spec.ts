import { BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { describe, expect, it, vi } from 'vitest';
import { AllExceptionsFilter } from './all-exceptions.filter';

function createResponse() {
  return {
    json: vi.fn(),
    status: vi.fn().mockReturnThis(),
  };
}

describe('AllExceptionsFilter', () => {
  it('preserves typed recovery payloads in normalized HttpException envelopes', () => {
    const response = createResponse();
    const request = {
      id: 'request-1',
      method: 'POST',
      path: '/workspace/github/organizations',
      url: '/workspace/github/organizations',
    };
    const host = {
      switchToHttp: () => ({
        getRequest: () => request,
        getResponse: () => response,
      }),
    };
    const filter = new AllExceptionsFilter({
      get: vi.fn().mockReturnValue('test'),
    } as never as ConfigService<never, true>);

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
});
