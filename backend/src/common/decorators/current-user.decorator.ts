import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { User } from '@/users/entities/user.entity';

/**
 * Custom parameter decorator that extracts the authenticated user
 * from the request object populated by JwtAuthGuard / JwtStrategy.
 *
 * Usage: @CurrentUser() user: User
 * Avoids using @Req() which returns an untyped `any`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): User => {
    const request = ctx.switchToHttp().getRequest<{ user: User }>();
    return request.user;
  },
);
