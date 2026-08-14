import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Query,
  Res,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiFoundResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiQuery,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import type { Response } from 'express';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SkipAuth } from '../../auth/decorators/skip-auth.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import {
  JiraAuthUrlResponseDto,
  JiraConnectionStatusResponseDto,
} from '../dto/jira-connection.dto';
import { JiraService } from '../services/jira.service';

@ApiTags('jira')
@Controller('jira')
export class JiraController {
  constructor(private readonly jira: JiraService) {}

  @Get('connection')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current Jira connection status' })
  @ApiOkResponse({ type: JiraConnectionStatusResponseDto })
  @ZodSerializerDto(JiraConnectionStatusResponseDto)
  connectionStatus(
    @CurrentUser() user: AuthUser,
  ): Promise<JiraConnectionStatusResponseDto> {
    return this.jira.connectionStatus(user);
  }

  @Get('auth-url')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create Atlassian OAuth authorization URL' })
  @ApiOkResponse({ type: JiraAuthUrlResponseDto })
  @ZodSerializerDto(JiraAuthUrlResponseDto)
  authUrl(@CurrentUser() user: AuthUser): Promise<JiraAuthUrlResponseDto> {
    return this.jira.authUrl(user);
  }

  @Delete('connection')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disconnect the Atlassian account' })
  @ApiNoContentResponse()
  disconnect(@CurrentUser() user: AuthUser): Promise<void> {
    return this.jira.disconnect(user);
  }

  @Get('callback')
  @SkipAuth()
  @ApiOperation({ summary: 'Atlassian OAuth callback' })
  @ApiQuery({ name: 'code', required: false, type: String })
  @ApiQuery({ name: 'state', required: false, type: String })
  @ApiQuery({ name: 'error', required: false, type: String })
  @ApiFoundResponse({
    description:
      'Redirect to the user SPA profile page: `?jira=connected` on success, otherwise `?jira=error&code=<safe-error-code>`.',
    headers: {
      Location: {
        description: 'Absolute user SPA profile URL to return the browser to.',
        schema: { type: 'string' },
      },
    },
  })
  async callback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('error') error: string | undefined,
    @Res() response: Response,
  ): Promise<void> {
    const redirect = await this.jira.completeCallback({ code, state, error });
    response.redirect(302, redirect);
  }
}
