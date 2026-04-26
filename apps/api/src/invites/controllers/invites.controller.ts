import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiCreatedResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import { SkipAuth } from '../../auth/decorators/skip-auth.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { WorkspaceAdminGuard } from '../../members/guards/workspace-admin.guard';
import { AcceptWorkspaceInviteDto } from '../dto/accept-workspace-invite.dto';
import { CreateWorkspaceInviteDto } from '../dto/create-workspace-invite.dto';
import { WorkspaceInviteListResponseDto } from '../dto/workspace-invite-list-response.dto';
import { WorkspaceInviteResponseDto } from '../dto/workspace-invite-response.dto';
import { InvitesService } from '../services/invites.service';

@ApiTags('invites')
@Controller('invites')
export class InvitesController {
  constructor(private readonly invites: InvitesService) {}

  @Get()
  @ApiBearerAuth()
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List pending workspace invites' })
  @ApiOkResponse({ type: WorkspaceInviteResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceInviteListResponseDto)
  listInvites(
    @CurrentUser() user: AuthUser,
  ): Promise<WorkspaceInviteResponseDto[]> {
    return this.invites.listInvites(user.workspaceId);
  }

  @Post()
  @ApiBearerAuth()
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Create and send a workspace invite' })
  @ApiCreatedResponse({ type: WorkspaceInviteResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceInviteResponseDto)
  createInvite(
    @CurrentUser() user: AuthUser,
    @Body() body: CreateWorkspaceInviteDto,
  ): Promise<WorkspaceInviteResponseDto> {
    return this.invites.createInvite(user.workspaceId, user.sub, body);
  }

  @Delete(':id')
  @ApiBearerAuth()
  @UseGuards(WorkspaceAdminGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Cancel a pending workspace invite' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Admin role required' })
  cancelInvite(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.invites.cancelInvite(user.workspaceId, id);
  }

  @Post('accept')
  @SkipAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Accept a workspace invite' })
  @ApiNoContentResponse()
  async acceptInvite(@Body() body: AcceptWorkspaceInviteDto): Promise<void> {
    await this.invites.acceptInvite(body);
  }
}
