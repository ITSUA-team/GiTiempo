import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBody,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
  ApiTooManyRequestsResponse,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import type { RegisterRequest } from '@gitiempo/shared';
import { ZodSerializerDto } from 'nestjs-zod';
import { ThrottleErrorCode } from '../../commons/decorators/throttle-error-code.decorator';
import { AuthService } from '../services/auth.service';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { LogoutDto } from '../dto/logout.dto';
import { RegisterDto } from '../dto/register.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';
import { RegisterBodyPipe } from '../pipes/register-body.pipe';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('login')
  @SkipAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Exchange a Firebase ID token for API tokens' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({ description: 'Invalid Firebase ID token' })
  @ZodSerializerDto(TokenPairResponseDto)
  login(@Body() body: LoginDto): Promise<TokenPairResponseDto> {
    return this.auth.login(body.firebaseIdToken);
  }

  @Post('register')
  @SkipAuth()
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  @ThrottleErrorCode('rate_limited')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register the first workspace owner and issue API tokens',
  })
  @ApiBody({ type: RegisterDto })
  @ApiCreatedResponse({ type: TokenPairResponseDto })
  @ApiBadRequestResponse({
    description: 'Invalid registration input or weak password',
  })
  @ApiConflictResponse({
    description: 'Duplicate email or workspace name unavailable',
  })
  @ApiTooManyRequestsResponse({ description: 'Too many registration attempts' })
  @ApiServiceUnavailableResponse({
    description: 'Registration could not complete safely',
  })
  @ZodSerializerDto(TokenPairResponseDto)
  register(
    @Body(new RegisterBodyPipe()) body: RegisterRequest,
  ): Promise<TokenPairResponseDto> {
    return this.auth.register(body);
  }

  @Post('refresh')
  @SkipAuth()
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate a refresh token' })
  @ApiOkResponse({ type: TokenPairResponseDto })
  @ApiUnauthorizedResponse({
    description: 'Unknown, revoked, or expired token',
  })
  @ZodSerializerDto(TokenPairResponseDto)
  refresh(@Body() body: RefreshDto): Promise<TokenPairResponseDto> {
    return this.auth.refresh(body.refreshToken);
  }

  @Post('logout')
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'End the session bound to the refresh token' })
  @ApiNoContentResponse()
  async logout(
    @CurrentUser('sub') sub: string,
    @Body() body: LogoutDto,
  ): Promise<void> {
    await this.auth.logout(body.refreshToken, sub);
  }
}
