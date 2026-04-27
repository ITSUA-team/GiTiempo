import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';
import { UpdateWorkspaceMemberRoleDto } from '../dto/update-workspace-member-role.dto';
import { WorkspaceMemberListResponseDto } from '../dto/workspace-member-list-response.dto';
import { WorkspaceMemberResponseDto } from '../dto/workspace-member-response.dto';
import { WorkspaceAdminGuard } from '../guards/workspace-admin.guard';
import { MembersService } from '../services/members.service';

@ApiTags('members')
@ApiBearerAuth()
@UseGuards(WorkspaceAdminGuard)
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List workspace members' })
  @ApiOkResponse({ type: WorkspaceMemberResponseDto, isArray: true })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceMemberListResponseDto)
  listMembers(
    @CurrentUser() user: AuthUser,
  ): Promise<WorkspaceMemberResponseDto[]> {
    return this.members.listMembers(user.workspaceId);
  }

  @Patch(':id/role')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update a workspace member role' })
  @ApiOkResponse({ type: WorkspaceMemberResponseDto })
  @ApiForbiddenResponse({ description: 'Admin role required' })
  @ZodSerializerDto(WorkspaceMemberResponseDto)
  updateRole(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
    @Body() body: UpdateWorkspaceMemberRoleDto,
  ): Promise<WorkspaceMemberResponseDto> {
    return this.members.updateMemberRole(user.workspaceId, id, body);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Remove a workspace member' })
  @ApiNoContentResponse()
  @ApiForbiddenResponse({ description: 'Admin role required' })
  removeMember(
    @CurrentUser() user: AuthUser,
    @Param('id') id: string,
  ): Promise<void> {
    return this.members.removeMember(user.workspaceId, id);
  }
}
