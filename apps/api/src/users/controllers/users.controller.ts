import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Patch,
} from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodSerializerDto } from 'nestjs-zod';
import { UsersService } from '../services/users.service';
import { UserResponseDto } from '../dto/user-response.dto';
import { UpdateUserDto } from '../dto/update-user.dto';

@ApiTags('users')
@Controller('users')
export class UsersController {
  constructor(private readonly users: UsersService) {}

  /**
   * Returns the currently authenticated user.
   *
   * Auth is not implemented yet — the service returns the first seeded
   * user (by email asc) so the frontend has a stable "me" to talk to.
   */
  @Get('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get the current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  getMe(): Promise<UserResponseDto> {
    return this.users.findCurrent();
  }

  /**
   * Updates mutable fields on the current user.
   *
   * Body must contain at least one of `displayName` / `avatarUrl`,
   * enforced by the shared Zod schema (`updateUserSchema`).
   */
  @Patch('me')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update the current user' })
  @ApiOkResponse({ type: UserResponseDto })
  @ZodSerializerDto(UserResponseDto)
  updateMe(@Body() body: UpdateUserDto): Promise<UserResponseDto> {
    return this.users.updateCurrent(body);
  }
}
