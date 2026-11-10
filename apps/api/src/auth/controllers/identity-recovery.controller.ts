import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBadRequestResponse,
  ApiBearerAuth,
  ApiConflictResponse,
  ApiForbiddenResponse,
  ApiNoContentResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiOperation,
  ApiServiceUnavailableResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CurrentUser } from '../decorators/current-user.decorator';
import { PlatformOperatorGuard } from '../guards/platform-operator.guard';
import { IdentityRecoveryAssessResponseDto } from '../dto/identity-recovery-assess-response.dto';
import { IdentityRecoveryResolveRequestDto } from '../dto/identity-recovery-resolve-request.dto';
import { AuthService } from '../services/auth.service';
import type { IdentityRecoveryAssessResponse } from '@gitiempo/shared';

@ApiTags('auth')
@ApiBearerAuth()
@Controller('auth/identity-recovery')
export class IdentityRecoveryController {
  constructor(private readonly auth: AuthService) {}

  @Get('assess')
  @UseGuards(PlatformOperatorGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'List aged unbound registration reservations' })
  @ApiOkResponse({ type: [IdentityRecoveryAssessResponseDto] })
  @ApiForbiddenResponse({ description: 'Platform operator role required' })
  async assess(): Promise<IdentityRecoveryAssessResponse[]> {
    const reservations =
      await this.auth.listAgedUnboundRegistrationReservations();
    this.auth.reportAgedUnboundRegistrationReservations(reservations);
    return reservations.map((reservation) => ({
      reservationId: reservation.id,
      normalizedEmail: reservation.normalizedEmail,
      firebaseUid: reservation.firebaseUid,
      // The aged query filters purpose='registration' AND state='reserved';
      // the row type is broader than the assess contract.
      purpose: reservation.purpose as IdentityRecoveryAssessResponse['purpose'],
      state: reservation.state as IdentityRecoveryAssessResponse['state'],
      registrationDisplayName: reservation.registrationDisplayName,
      registrationWorkspaceName: reservation.registrationWorkspaceName,
      createdAt: reservation.createdAt.toISOString(),
    }));
  }

  @Post('resolve')
  @UseGuards(PlatformOperatorGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Resolve a conclusively abandoned registration reservation',
  })
  @ApiNoContentResponse()
  @ApiBadRequestResponse({ description: 'Invalid operator input' })
  @ApiForbiddenResponse({ description: 'Platform operator role required' })
  @ApiNotFoundResponse({ description: 'Registration reservation not found' })
  @ApiConflictResponse({
    description:
      'Reservation is not resolvable (state, age, or adoption check)',
  })
  @ApiServiceUnavailableResponse({
    description: 'Outcome is uncertain; the reservation stays retained',
  })
  async resolve(
    @CurrentUser('sub') operatorIdentity: string,
    @Body() body: IdentityRecoveryResolveRequestDto,
  ): Promise<void> {
    await this.auth.resolveConclusivelyAbandonedRegistration({
      reservationId: body.reservationId,
      operatorDecision: body.operatorDecision,
      operatorIdentity,
    });
  }
}
