import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiNoContentResponse,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { ZodSerializerDto } from 'nestjs-zod';
import { AuthService } from '../services/auth.service';
import { SkipAuth } from '../decorators/skip-auth.decorator';
import { CurrentUser } from '../decorators/current-user.decorator';
import { LoginDto } from '../dto/login.dto';
import { RefreshDto } from '../dto/refresh.dto';
import { LogoutDto } from '../dto/logout.dto';
import { TokenPairResponseDto } from '../dto/token-pair-response.dto';

/**
 * HTTP surface for Firebase-backed auth:
 *
 *  - `POST /auth/login`   (public)   — exchange a Firebase ID token for a
 *                                      local (access, refresh) pair.
 *  - `POST /auth/refresh` (public)   — rotate a refresh token.
 *  - `POST /auth/logout`  (bearer)   — end the session tied to a refresh
 *                                      token. Bearer auth is required so
 *                                      only the session owner can call it.
 *
 * Per-route throttling is stricter than the global default to blunt
 * credential-stuffing and refresh-replay probes before the heavier
 * Firebase and DB work runs.
 */
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
