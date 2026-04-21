import { SetMetadata } from '@nestjs/common';

/**
 * Metadata key the global `JwtAuthGuard` inspects to decide whether a
 * handler (or controller class) bypasses bearer-token verification.
 */
export const SKIP_AUTH_KEY = 'skipAuth';

/**
 * Opt a route out of the global `JwtAuthGuard`. Use sparingly; every new
 * route is authenticated by default.
 */
export const SkipAuth = () => SetMetadata(SKIP_AUTH_KEY, true);
