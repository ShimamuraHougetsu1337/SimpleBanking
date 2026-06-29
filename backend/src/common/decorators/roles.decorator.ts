import { SetMetadata } from '@nestjs/common';
import { UserRole } from '@/users/entities/user.entity';

/** Metadata key used by RolesGuard to read allowed roles from route handlers. */
export const ROLES_KEY = 'roles';

/**
 * Decorator that restricts a route to users with the specified roles.
 *
 * Usage:
 *   @Roles(UserRole.ADMIN)
 *   @UseGuards(JwtAuthGuard, RolesGuard)
 */
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
