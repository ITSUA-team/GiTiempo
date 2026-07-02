import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { UsersService } from '../services/users.service';
import { CurrentUserWorkspaceMembershipListResponseDto } from '../dto/current-user-workspace-membership-list-response.dto';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';
import { CurrentUser } from '../../auth/decorators/current-user.decorator';
import type { AuthUser } from '../../auth/types/auth-user';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  getMe(@CurrentUser() user: AuthUser): Promise<UserResponseDto> {
    return this.users.findById(user.sub, user.workspaceId);
  }

  @Get('me/workspaces')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List the current user workspace memberships' })
  @ApiOkResponse({ type: CurrentUserWorkspaceMembershipListResponseDto })
  @ZodSerializerDto(CurrentUserWorkspaceMembershipListResponseDto)
  listCurrentUserWorkspaces(
    @CurrentUser() user: AuthUser,
  ): Promise<CurrentUserWorkspaceMembershipListResponseDto> {
    return this.users.listCurrentUserWorkspaces(user.sub, user.workspaceId);
  }

  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  updateMe(
    @CurrentUser() user: AuthUser,
    @Body() body: UpdateUserDto,
  ): Promise<UserResponseDto> {
    return this.users.updateById(user.sub, user.workspaceId, body);
  }
}
